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

    if (lat !== undefined && lat !== null && isNaN(parseFloat(lat))) {
      return NextResponse.json({ error: "Valid latitude is required" }, { status: 400 })
    }
    if (lng !== undefined && lng !== null && isNaN(parseFloat(lng))) {
      return NextResponse.json({ error: "Valid longitude is required" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: {
        ...(name         !== undefined && { name: name.trim() }),
        ...(farmName     !== undefined && { farmName: farmName?.trim() || null }),
        ...(bio          !== undefined && { bio: bio?.trim() || null }),
        ...(profileImage !== undefined && { profileImage: profileImage?.trim() || null }),
        ...(address      !== undefined && { address: address?.trim() || null }),
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

    // Synchronize updated location to active/pending orders so farmer delivery maps reflect changes
    if (lat !== undefined || lng !== undefined || address !== undefined) {
      const newLat = lat !== undefined ? (lat !== null ? parseFloat(lat) : null) : undefined
      const newLng = lng !== undefined ? (lng !== null ? parseFloat(lng) : null) : undefined
      const newAddr = address !== undefined ? (address?.trim() || null) : undefined

      await prisma.order.updateMany({
        where: {
          userId: parseInt(session.user.id),
          status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] },
        },
        data: {
          ...(newLat !== undefined && { deliveryLat: newLat }),
          ...(newLng !== undefined && { deliveryLng: newLng }),
          ...(newAddr !== undefined && { deliveryAddress: newAddr }),
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT /api/profile]", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
