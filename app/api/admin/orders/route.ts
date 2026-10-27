// app/api/admin/orders/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return null
  return session
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, address: true } },
      items: {
        include: {
          product: { select: { name: true, imageUrl: true } },
        },
      },
    },
  })
  return NextResponse.json(orders)
}

export async function PATCH(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 })

  const validStatuses = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const orderId = parseInt(id)

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  })

  // Synchronize item-level statuses so farmer and customer views stay 100% in sync
  await prisma.orderItem.updateMany({
    where: { orderId },
    data: { status },
  })

  return NextResponse.json(order)
}
