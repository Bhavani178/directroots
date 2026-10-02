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

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// Returns all orders for the logged-in customer, newest first.
// Items include product + farmer info for display.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orders = await prisma.order.findMany({
    take: 50,
    where: { userId: parseInt(session.user.id) },
    include: {
      items: {
        include: {
          product: {
            include: {
              farmer: {
                select: { id: true, name: true, farmName: true, profileImage: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(orders)
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Creates an order from the customer's cart.
// Enforces 50km seller service radius server-side during transaction.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)

  try {
    const body = await req.json().catch(() => ({}))
    const { deliveryAddress, deliveryLat, deliveryLng } = body

    // Execute checkout atomically in a single database transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Fetch current cart items with latest product stock and seller coordinates
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            include: { farmer: { select: { id: true, name: true, farmName: true, lat: true, lng: true } } },
          },
        },
      })

      if (cartItems.length === 0) {
        throw new Error("Cart is empty")
      }

      // Fallback: use customer's stored coordinates if not provided in checkout
      let finalLat = deliveryLat ?? null
      let finalLng = deliveryLng ?? null

      if (!finalLat || !finalLng) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { lat: true, lng: true, address: true },
        })
        finalLat = user?.lat ?? null
        finalLng = user?.lng ?? null
      }

      if (!hasConfirmedLocation({ lat: finalLat, lng: finalLng })) {
        throw new Error("Please drag the pin to your actual delivery location before confirming. The initial default location is not a valid delivery address.")
      }

      // 2. Verify stock availability & 50km seller radius for each product
      for (const item of cartItems) {
        if (item.product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${item.product.name}`)
        }

        if (item.product.farmer.lat && item.product.farmer.lng) {
          const dist = haversine(finalLat, finalLng, item.product.farmer.lat, item.product.farmer.lng)
          if (dist > MAX_FARM_DELIVERY_KM) {
            throw new Error(`Product "${item.product.name}" from seller is beyond your ${MAX_FARM_DELIVERY_KM} km delivery radius (${dist.toFixed(1)} km away).`)
          }
        }

        // Atomic stock decrement with concurrency check
        const updated = await tx.product.updateMany({
          where: { 
            id: item.productId,
            stock: { gte: item.quantity }
          },
          data: { stock: { decrement: item.quantity } },
        })

        if (updated.count === 0) {
          throw new Error(`Insufficient stock for product: ${item.product.name} (it may have just sold out)`)
        }
      }

      // 3. Compute total with 2 decimal place rounding
      const rawTotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      )
      const total = Math.round(rawTotal * 100) / 100

      // 4. Create order with snapshot prices
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          status: "PENDING",
          deliveryAddress: deliveryAddress ?? null,
          deliveryLat:     finalLat,
          deliveryLng:     finalLng,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity:  item.quantity,
              price:     item.product.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  farmer: { select: { id: true, name: true, farmName: true } },
                },
              },
            },
          },
        },
      })

      // 6. Clear user cart
      await tx.cartItem.deleteMany({ where: { userId } })

      return newOrder
    }, {
      maxWait: 5000,
      timeout: 15000,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    console.error("[POST /api/orders]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create order" },
      { status: 400 }
    )
  }
}