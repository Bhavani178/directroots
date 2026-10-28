import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"

// ─── POST /api/farmer/become-seller ───────────────────────────────────────────
// Allows an existing authenticated CUSTOMER to upgrade their account to FARMER
// or ARTISAN with their farm/store name, immediately unlocking the seller dashboard.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to become a seller" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { farmName, sellerType, bio, address, lat, lng } = body

    const targetRole = sellerType === "ARTISAN" ? "ARTISAN" : "FARMER"
    const userId = parseInt(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const defaultFarmName = farmName?.trim() || `${user.name || "My"}'s ${targetRole === "ARTISAN" ? "Crafts Studio" : "Farm"}`

    // Only assign coordinates if explicitly confirmed and valid
    let confirmedLat: number | undefined
    let confirmedLng: number | undefined
    if (typeof lat === "number" && typeof lng === "number" && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      confirmedLat = lat
      confirmedLng = lng
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: targetRole,
        farmName: defaultFarmName,
        ...(bio && { bio: bio.trim() }),
        ...(address && { address: address.trim() }),
        ...(confirmedLat !== undefined && { lat: confirmedLat }),
        ...(confirmedLng !== undefined && { lng: confirmedLng }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        farmName: true,
        address: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Congratulations! You are now registered as a ${targetRole.toLowerCase()} seller.`,
      user: updatedUser,
      role: updatedUser.role,
    })
  } catch (error) {
    console.error("[POST /api/farmer/become-seller]", error)
    return NextResponse.json({ error: "Failed to activate seller account" }, { status: 500 })
  }
}
