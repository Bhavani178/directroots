import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ─── GET /api/producers/[id] ──────────────────────────────────────────────────
// Public. Returns a producer's public profile plus their active products.
// Restricts queries strictly to FARMER and ARTISAN roles.
// Protects seller privacy: does not expose exact private coordinates or street addresses.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid producer ID" }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const rawLat = searchParams.get("lat")
  const rawLng = searchParams.get("lng")
  const customerLat = (rawLat && !isNaN(parseFloat(rawLat))) ? parseFloat(rawLat) : null
  const customerLng = (rawLng && !isNaN(parseFloat(rawLng))) ? parseFloat(rawLng) : null

  const producer = await prisma.user.findFirst({
    where: {
      id,
      role: { in: ["FARMER", "ARTISAN"] },
    },
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

  // Return 404 for non-existent users or customer accounts (prevent user role enumeration)
  if (!producer) {
    return NextResponse.json({ error: "Producer not found" }, { status: 404 })
  }

  // Compute distance if valid customer coordinates provided
  let distanceKm: number | null = null
  if (
    customerLat !== null &&
    customerLng !== null &&
    producer.lat !== null &&
    producer.lng !== null &&
    !isNaN(customerLat) &&
    !isNaN(customerLng)
  ) {
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

  // Privacy protection: Return only public fields
  // Extract general location (city/district/state) without raw street details or exact coordinates
  const generalLocation = producer.address
    ? producer.address.split(",").slice(-2).join(",").trim()
    : "Karnataka, India"

  return NextResponse.json({
    id: producer.id,
    name: producer.name,
    farmName: producer.farmName || producer.name,
    bio: producer.bio,
    profileImage: producer.profileImage,
    role: producer.role,
    location: generalLocation,
    distanceKm,
    createdAt: producer.createdAt,
    products: producer.products,
  })
}
