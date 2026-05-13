import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

async function geocodeAddress(address: string) {
  const encoded = encodeURIComponent(address)
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
    { headers: { "User-Agent": "DirectRoots/1.0" } }
  )
  const data = await res.json()
  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  }
  return { lat: null, lng: null }
}

export async function POST(req: Request) {
  try {
    const { name, email, password, role, address } = await req.json()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Geocode address to lat/lng
    const { lat, lng } = address ? await geocodeAddress(address) : { lat: null, lng: null }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role === "FARMER" ? "FARMER" : "CUSTOMER",
        address: address || null,
        lat,
        lng,
      },
    })

    return NextResponse.json({ id: user.id, name: user.name, role: user.role })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}