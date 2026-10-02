import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"
import { MAX_FARM_DELIVERY_KM } from "@/lib/config"

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── GET /api/products/[id] ───────────────────────────────────────────────────
// Public. Returns full product with farmer profile.
// Enforces 50km seller service radius for customers if location is available.
// Sellers can always view their own products regardless of distance.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      farmer: {
        select: {
          id: true,
          name: true,
          farmName: true,
          bio: true,
          profileImage: true,
          address: true,
          lat: true,
          lng: true,
          role: true,
          createdAt: true,
        },
      },
    },
  })

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  // Check if requesting user is the seller/owner
  const session = await getServerSession(authOptions)
  const isOwner = session?.user?.id && parseInt(session.user.id) === product.farmerId

  if (!isOwner) {
    const { searchParams } = new URL(req.url)
    let customerLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null
    let customerLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null

    if ((customerLat === null || customerLng === null) && session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { lat: true, lng: true },
      })
      if (user?.lat && user?.lng) {
        customerLat = user.lat
        customerLng = user.lng
      }
    }

    if (customerLat !== null && customerLng !== null && product.farmer.lat && product.farmer.lng) {
      const dist = haversine(customerLat, customerLng, product.farmer.lat, product.farmer.lng)
      if (dist > MAX_FARM_DELIVERY_KM) {
        return NextResponse.json(
          { error: "Product is not available in your area (beyond 50 km local service radius)." },
          { status: 404 }
        )
      }
    }
  }

  return NextResponse.json(product)
}

// ─── PUT /api/products/[id] ───────────────────────────────────────────────────
// Protected: owner only (the farmer/artisan who created this product).
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })

  // Ownership check
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (existing.farmerId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "You do not own this product" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      name, description, price, stock, imageUrl,
      category, unit, harvestDate, isOrganic,
      isHandmade, craftType,
    } = body

    if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 })
    }
    if (stock !== undefined && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      return NextResponse.json({ error: "Valid stock quantity is required" }, { status: 400 })
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(price       !== undefined && { price: parseFloat(price) }),
        ...(stock       !== undefined && { stock: parseInt(stock) }),
        ...(imageUrl    !== undefined && { imageUrl: imageUrl?.trim() || null }),
        ...(category    !== undefined && { category: category.trim() }),
        ...(unit        !== undefined && { unit: unit.trim() }),
        ...(harvestDate !== undefined && { harvestDate: harvestDate ? new Date(harvestDate) : null }),
        ...(isOrganic   !== undefined && { isOrganic: Boolean(isOrganic) }),
        ...(isHandmade  !== undefined && { isHandmade: Boolean(isHandmade) }),
        ...(craftType   !== undefined && { craftType: craftType?.trim() || null }),
      },
      include: {
        farmer: {
          select: { id: true, name: true, farmName: true, profileImage: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT /api/products/[id]]", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

// ─── DELETE /api/products/[id] ────────────────────────────────────────────────
// Protected: owner only. Was previously unguarded — critical security fix.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })

  // Ownership check
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (existing.farmerId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "You do not own this product" }, { status: 403 })
  }

  try {
    // Remove from carts first (prevent FK violation)
    await prisma.cartItem.deleteMany({ where: { productId: id } })
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/products/[id]]", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}