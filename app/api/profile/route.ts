import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"

// ─── GET /api/profile ─────────────────────────────────────────────────────────
// Returns the logged-in user's full profile.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      farmName: true,
      bio: true,
      profileImage: true,
      address: true,
      lat: true,
      lng: true,
      createdAt: true,
    },
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  return NextResponse.json(user)
}

// ─── PUT /api/profile ─────────────────────────────────────────────────────────
// Updates the logged-in user's profile.
// Accepted fields: name, farmName, bio, profileImage, address, lat, lng
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, farmName, bio, profileImage, address, lat, lng } = body

    if (lat !== undefined && lat !== null) {
      const parsedLat = parseFloat(lat)
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        return NextResponse.json({ error: "Valid latitude (-90 to 90) is required" }, { status: 400 })
      }
    }
    if (lng !== undefined && lng !== null) {
      const parsedLng = parseFloat(lng)
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        return NextResponse.json({ error: "Valid longitude (-180 to 180) is required" }, { status: 400 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: {
        ...(name         !== undefined && { name: String(name).trim().slice(0, 100) }),
        ...(farmName     !== undefined && { farmName: farmName ? String(farmName).trim().slice(0, 120) : null }),
        ...(bio          !== undefined && { bio: bio ? String(bio).trim().slice(0, 1000) : null }),
        ...(profileImage !== undefined && { profileImage: profileImage ? String(profileImage).trim() : null }),
        ...(address      !== undefined && { address: address ? String(address).trim().slice(0, 300) : null }),
        ...(lat          !== undefined && { lat: lat !== null ? parseFloat(lat) : null }),
        ...(lng          !== undefined && { lng: lng !== null ? parseFloat(lng) : null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        farmName: true,
        bio: true,
        profileImage: true,
        address: true,
        lat: true,
        lng: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT /api/profile]", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
