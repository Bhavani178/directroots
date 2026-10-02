import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"

// ─── GET /api/farmer/orders ───────────────────────────────────────────────────
// Returns only orders that contain products owned by the logged-in farmer/artisan.
// Fixes the critical bug where all orders were returned regardless of farmer.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "FARMER" && session.user.role !== "ARTISAN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const farmerId = parseInt(session.user.id)

  // Find orders that contain at least one item from this farmer's products
  const orders = await prisma.order.findMany({
    take: 50,
    where: {
      items: {
        some: {
          product: { farmerId },
        },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, address: true } },
      items: {
        where: { product: { farmerId } }, // Only fetch items belonging to this farmer
        include: {
          product: {
            select: { id: true, name: true, price: true, imageUrl: true }
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Recalculate the total so the farmer only sees revenue for their portion of the order.
  const scoped = orders.map((order) => {
    const farmerTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    return {
      ...order,
      total: Math.round(farmerTotal * 100) / 100, // Ensure precision
    }
  })

  return NextResponse.json(scoped)
}

// ─── PATCH /api/farmer/orders ─────────────────────────────────────────────────
// Updates order status for only this farmer's items, then computes the aggregate
// parent Order status based on all items in the order.
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "FARMER" && session.user.role !== "ARTISAN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const farmerId = parseInt(session.user.id)
  const { orderId, status } = await req.json()

  if (!orderId || !status) {
    return NextResponse.json({ error: "orderId and status are required" }, { status: 400 })
  }

  const validStatuses = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
  }

  // Verify ownership: does this order contain this farmer's products?
  const farmerItems = await prisma.orderItem.findMany({
    where: {
      orderId,
      product: { farmerId },
    },
  })

  if (farmerItems.length === 0) {
    return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 })
  }

  // 1. Update only this farmer's items to the new status
  await prisma.orderItem.updateMany({
    where: {
      orderId,
      product: { farmerId },
    },
    data: { status },
  })

  // 2. Compute the aggregate parent Order status
  // "PENDING" if any item is still pending, "DELIVERED" only if ALL items are delivered, etc.
  const allOrderItems = await prisma.orderItem.findMany({
    where: { orderId },
  })

  const statusPriority = {
    PENDING: 0,
    PREPARING: 1,
    OUT_FOR_DELIVERY: 2,
    DELIVERED: 3,
  }

  let minStatusVal = 3
  let computedStatus: "PENDING" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" = "DELIVERED"

  for (const item of allOrderItems) {
    const itemStatusVal = statusPriority[item.status as keyof typeof statusPriority] ?? 0
    if (itemStatusVal < minStatusVal) {
      minStatusVal = itemStatusVal
      computedStatus = item.status as any
    }
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: computedStatus },
  })

  return NextResponse.json(updatedOrder)
}