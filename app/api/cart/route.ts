import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.cartItem.findMany({
    where: { userId: parseInt(session.user.id) },
    include: { product: true },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { productId, quantity } = await req.json()

  const existing = await prisma.cartItem.findFirst({
    where: { userId: parseInt(session.user.id), productId },
  })

  if (existing) {
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
      include: { product: true },
    })
    return NextResponse.json(updated)
  }

  const item = await prisma.cartItem.create({
    data: { userId: parseInt(session.user.id), productId, quantity },
    include: { product: true },
  })
  return NextResponse.json(item)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await prisma.cartItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}