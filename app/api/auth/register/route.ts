import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

async function geocodeAddress(address: string): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const encoded = encodeURIComponent(address.trim())
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`,
      { headers: { "User-Agent": "DirectRoots/1.0 (directroots-fyp@example.com)" } }
    )
    const data = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch (err) {
    console.error("[geocodeAddress]", err)
  }
  return { lat: null, lng: null }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, role, address, farmName, lat: reqLat, lng: reqLng } = body

    // Validation
    if (!name?.trim())     return NextResponse.json({ error: "Name is required" }, { status: 400 })
    if (!email?.trim())    return NextResponse.json({ error: "Email is required" }, { status: 400 })
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const hasMinLength = password.length >= 8
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[^A-Za-z0-9]/.test(password)

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.",
        },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 })
    }

    // Normalise role — only accept known roles
    const validRoles = ["FARMER", "ARTISAN", "CUSTOMER"]
    const userRole = validRoles.includes(role) ? role : "CUSTOMER"

    const hashedPassword = await bcrypt.hash(password, 10)

    // If lat and lng provided in request body (e.g. from location picker), validate them
    let lat: number | null = null
    let lng: number | null = null
    if (typeof reqLat === "number" && typeof reqLng === "number") {
      if (reqLat >= -90 && reqLat <= 90 && reqLng >= -180 && reqLng <= 180) {
        lat = reqLat
        lng = reqLng
      }
    }

    const user = await prisma.user.create({
      data: {
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password: hashedPassword,
        role:     userRole,
        farmName: (userRole === "FARMER" || userRole === "ARTISAN") ? (farmName?.trim() || null) : null,
        address:  address?.trim() || null,
        lat,
        lng,
        emailVerified: new Date(),
      },
    })

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        message: "Account created successfully!",
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[POST /api/auth/register]", error)
    return NextResponse.json({ error: "Registration failed: " + (error?.message || String(error)) }, { status: 500 })
  }
}