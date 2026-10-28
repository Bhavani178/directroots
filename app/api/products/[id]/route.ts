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
// Public. Returns full product with producer public info.
// Privacy protection: Does not expose raw private addresses or centimeter coordinates.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })

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

  const session = await getServerSession(authOptions)
  const isOwner = session?.user?.id && parseInt(session.user.id) === product.farmerId
  let distanceKm: number | null = null

  if (!isOwner) {
    const { searchParams } = new URL(req.url)
    const rawLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null
    const rawLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null
    let customerLat = (rawLat !== null && !isNaN(rawLat)) ? rawLat : null
    let customerLng = (rawLng !== null && !isNaN(rawLng)) ? rawLng : null

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

    if (
      customerLat !== null &&
      customerLng !== null &&
      product.farmer.lat !== null &&
      product.farmer.lng !== null
    ) {
      const dist = haversine(customerLat, customerLng, product.farmer.lat, product.farmer.lng)
      distanceKm = parseFloat(dist.toFixed(2))
      // Note: 50km service radius is enforced at order placement (checkout), not here.
      // Blocking the detail page with a 404 causes confusing "Product not found" errors for
      // customers who already have the item in cart. Distance is returned for UI display only.
    }
  }

  // Sanitize farmer data before returning publicly
  const generalLocation = product.farmer.address
    ? product.farmer.address.split(",").slice(-2).join(",").trim()
    : "Karnataka, India"

  const sanitizedProduct = {
    ...product,
    distanceKm,
    farmer: {
      id: product.farmer.id,
      name: product.farmer.name,
      farmName: product.farmer.farmName || product.farmer.name,
      bio: product.farmer.bio,
      profileImage: product.farmer.profileImage,
      role: product.farmer.role,
      location: generalLocation,
    },
  }

  return NextResponse.json(sanitizedProduct)
}

// ─── PUT /api/products/[id] ───────────────────────────────────────────────────
// Protected: owner only (the farmer/artisan who created this product) or ADMIN.
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const isOwner = existing.farmerId === parseInt(session.user.id)
  const isAdmin = session.user.role === "ADMIN"

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "You do not have permission to modify this product" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const {
      name, description, price, stock, imageUrl,
      category, unit, harvestDate, isOrganic,
      isHandmade, craftType,
    } = body

    if (price !== undefined) {
      const parsedPrice = parseFloat(price)
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 })
      }
    }

    if (stock !== undefined) {
      const parsedStock = parseInt(stock)
      if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
        return NextResponse.json({ error: "Stock must be a non-negative integer" }, { status: 400 })
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name: String(name).trim().slice(0, 150) }),
        ...(description !== undefined && { description: description ? String(description).trim().slice(0, 2000) : null }),
        ...(price       !== undefined && { price: parseFloat(price) }),
        ...(stock       !== undefined && { stock: parseInt(stock) }),
        ...(imageUrl    !== undefined && { imageUrl: imageUrl ? String(imageUrl).trim() : null }),
        ...(category    !== undefined && { category: String(category).trim().slice(0, 50) }),
        ...(unit        !== undefined && { unit: String(unit).trim().slice(0, 20) }),
        ...(harvestDate !== undefined && { harvestDate: harvestDate ? new Date(harvestDate) : null }),
        ...(isOrganic   !== undefined && { isOrganic: Boolean(isOrganic) }),
        ...(isHandmade  !== undefined && { isHandmade: Boolean(isHandmade) }),
        ...(craftType   !== undefined && { craftType: craftType ? String(craftType).trim().slice(0, 50) : null }),
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
// Protected: owner or ADMIN. Handles relational integrity safely.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const isOwner = existing.farmerId === parseInt(session.user.id)
  const isAdmin = session.user.role === "ADMIN"

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "You do not have permission to delete this product" }, { status: 403 })
  }

  try {
    // Check if this product has existing orders
    const orderCount = await prisma.orderItem.count({ where: { productId: id } })

    if (orderCount > 0) {
      // Retain order history integrity: archive product by removing from carts & zeroing stock
      await prisma.cartItem.deleteMany({ where: { productId: id } })
      await prisma.product.update({
        where: { id },
        data: { stock: 0 },
      })
      return NextResponse.json({
        success: true,
        archived: true,
        message: "Product has associated customer order history and has been archived from active listings.",
      })
    }

    // No order history: safe to hard delete
    await prisma.cartItem.deleteMany({ where: { productId: id } })
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/products/[id]]", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
