import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  // Rate limit: max 5 registrations per 15 minutes per IP
  const rateLimit = checkRateLimit(req, "register", 5, 15 * 60)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many registration attempts. Please try again in ${rateLimit.retryAfter} seconds.` },
      { status: 429 }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { name, email, password, role, address, farmName, lat: reqLat, lng: reqLng } = body

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const hasMinLength = password.length >= 8 && password.length <= 128
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[^A-Za-z0-9]/.test(password)

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return NextResponse.json(
        {
          error:
            "Password must be 8-128 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.",
        },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 })
    }

    // Role enforcement: Never allow self-registration as ADMIN
    const validRoles = ["FARMER", "ARTISAN", "CUSTOMER"]
    const userRole = validRoles.includes(role) ? role : "CUSTOMER"

    const hashedPassword = await bcrypt.hash(password, 10)

    // Validate coordinates if provided
    let lat: number | null = null
    let lng: number | null = null
    if (typeof reqLat === "number" && typeof reqLng === "number") {
      if (reqLat >= -90 && reqLat <= 90 && reqLng >= -180 && reqLng <= 180) {
        lat = reqLat
        lng = reqLng
      }
    }

    // SECURITY: Do NOT mark emailVerified as verified on registration.
    // Unverified accounts start with emailVerified = null.
    const user = await prisma.user.create({
      data: {
        name: name.trim().slice(0, 100),
        email: cleanEmail,
        password: hashedPassword,
        role: userRole as "FARMER" | "ARTISAN" | "CUSTOMER",
        farmName: (userRole === "FARMER" || userRole === "ARTISAN") ? (farmName?.trim()?.slice(0, 120) || null) : null,
        address: address ? String(address).trim().slice(0, 300) : null,
        lat,
        lng,
        emailVerified: null,
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
  } catch (error) {
    console.error("[POST /api/auth/register]", error)
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 })
  }
}
