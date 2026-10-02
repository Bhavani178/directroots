import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ─── GET /api/producers/[id] ──────────────────────────────────────────────────
// Public. Returns a producer's profile plus all their products.
// Accepts ?lat=&lng= query params to compute distance from customer.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid producer ID" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const customerLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null
  const customerLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null

  const producer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      farmName: true,
      bio: true,
      profileImage: true,
      role: true,
      address: true,
      lat: true,
      lng: true,
      createdAt: true,
      products: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          imageUrl: true,
          category: true,
          unit: true,
          harvestDate: true,
          isOrganic: true,
          isHandmade: true,
          craftType: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!producer) return NextResponse.json({ error: "Producer not found" }, { status: 404 })

  // Only expose FARMER and ARTISAN profiles
  if (producer.role === "CUSTOMER") {
    return NextResponse.json({ error: "Not a producer account" }, { status: 403 })
  }

  // Compute distance if customer coordinates provided
  let distanceKm: number | null = null
  if (customerLat !== null && customerLng !== null && producer.lat && producer.lng) {
    const R = 6371
    const dLat = ((producer.lat - customerLat) * Math.PI) / 180
    const dLng = ((producer.lng - customerLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((customerLat * Math.PI) / 180) *
      Math.cos((producer.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
    distanceKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2))
  }

  return NextResponse.json({ ...producer, distanceKm })
}
