import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"
import { MAX_FARM_DELIVERY_KM } from "@/lib/config"
import { hasConfirmedLocation } from "@/lib/location"

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

// ─── GET /api/cart ────────────────────────────────────────────────────────────
// Returns all cart items for the logged-in user.
// Includes product + farmer so cart can display producer info.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.cartItem.findMany({
    where: { userId: parseInt(session.user.id) },
    select: {
      id: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          unit: true,
          imageUrl: true,
          category: true,
          description: true,
          stock: true,
          farmer: {
            select: { id: true, name: true, farmName: true, profileImage: true },
          },
        },
      },
    },
  })

  return NextResponse.json(items)
}

// ─── POST /api/cart ───────────────────────────────────────────────────────────
// Adds item to cart or increments quantity if already present.
// Uses upsert with the unique [userId, productId] constraint.
// Server-side enforcement: rejects any item beyond 50km seller service radius.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { productId, quantity = 1 } = await req.json()

  if (!productId || isNaN(parseInt(productId))) {
    return NextResponse.json({ error: "Valid productId is required" }, { status: 400 })
  }

  // Verify product exists and has stock
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId) },
    include: { farmer: { select: { id: true, name: true, farmName: true, lat: true, lng: true } } },
  })
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (product.stock < 1) return NextResponse.json({ error: "Out of stock" }, { status: 400 })

  // Verify customer delivery location & 50km service radius restriction
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lat: true, lng: true },
  })

  if (!hasConfirmedLocation(user)) {
    return NextResponse.json(
      { error: "Please set and confirm your delivery location on the map before adding items to cart." },
      { status: 400 }
    )
  }

  if (product.farmer.lat && product.farmer.lng) {
    const distanceKm = haversine(user!.lat!, user!.lng!, product.farmer.lat, product.farmer.lng)
    if (distanceKm > MAX_FARM_DELIVERY_KM) {
      return NextResponse.json(
        { error: `Seller is beyond your ${MAX_FARM_DELIVERY_KM} km local service radius (${distanceKm.toFixed(1)} km away).` },
        { status: 400 }
      )
    }
  }

  const pId = parseInt(productId)
  const item = await prisma.cartItem.upsert({
    where: {
      userId_productId: { userId, productId: pId },
    },
    create: {
      userId,
      productId: pId,
      quantity,
    },
    update: {
      quantity: { increment: quantity },
    },
    include: {
      product: {
        include: {
          farmer: { select: { id: true, name: true, farmName: true, profileImage: true } },
        },
      },
    },
  })

  return NextResponse.json(item, { status: 200 })
}

// ─── DELETE /api/cart ─────────────────────────────────────────────────────────
// Removes a cart item by its ID. Verifies the item belongs to this user.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: "Cart item ID is required" }, { status: 400 })

  // Ownership check
  const item = await prisma.cartItem.findUnique({ where: { id } })
  if (!item || item.userId !== userId) {
    return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
  }

  await prisma.cartItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// ─── PATCH /api/cart ──────────────────────────────────────────────────────────
// Sets an exact quantity on a cart item by its ID.
// Body: { id: cartItemId, quantity: number }
// quantity <= 0 → treated as delete (consistent with removeFromCart).
// Ownership check: only the cart row's owner can update it.
// Stock check: rejects requests exceeding available product.stock with HTTP 400.
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  const { id, quantity } = await req.json()

  if (!id) return NextResponse.json({ error: "Cart item ID is required" }, { status: 400 })
  if (quantity === undefined || quantity === null) {
    return NextResponse.json({ error: "quantity is required" }, { status: 400 })
  }

  // Ownership check & Product stock fetch
  const item = await prisma.cartItem.findUnique({
    where: { id },
    include: { product: { select: { stock: true, name: true } } },
  })
  if (!item || item.userId !== userId) {
    return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
  }

  // quantity <= 0 → delete the row (consistent with remove behaviour)
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  }

  // Reject if requested quantity exceeds current product stock
  if (quantity > item.product.stock) {
    return NextResponse.json(
      { error: "Quantity exceeds available stock" },
      { status: 400 }
    )
  }

  const updated = await prisma.cartItem.update({
    where: { id },
    data: { quantity },
    include: {
      product: {
        include: {
          farmer: { select: { id: true, name: true, farmName: true, profileImage: true } },
        },
      },
    },
  })

  return NextResponse.json(updated)
}