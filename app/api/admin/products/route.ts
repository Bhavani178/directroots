// app/api/admin/products/route.ts
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

  const products = await prisma.product.findMany({
    include: { farmer: { select: { id: true, name: true, farmName: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(products)
}

export async function POST(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { name, category, price, unit, stock, description, imageUrl, isOrganic, isHandmade, craftType, farmerId } = body

  if (!name || !category || !price || !farmerId) {
    return NextResponse.json({ error: "name, category, price, farmerId are required" }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: { name, category, price: parseFloat(price), unit: unit ?? "kg", stock: parseInt(stock ?? 0), description, imageUrl, isOrganic: !!isOrganic, isHandmade: !!isHandmade, craftType, farmerId: parseInt(farmerId) },
  })
  return NextResponse.json(product, { status: 201 })
}

export async function PATCH(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: {
      ...(data.name       !== undefined && { name: data.name }),
      ...(data.price      !== undefined && { price: parseFloat(data.price) }),
      ...(data.stock      !== undefined && { stock: parseInt(data.stock) }),
      ...(data.category   !== undefined && { category: data.category }),
      ...(data.unit       !== undefined && { unit: data.unit }),
      ...(data.imageUrl   !== undefined && { imageUrl: data.imageUrl }),
      ...(data.isOrganic  !== undefined && { isOrganic: data.isOrganic }),
      ...(data.description!== undefined && { description: data.description }),
    },
  })
  return NextResponse.json(product)
}

export async function DELETE(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await prisma.product.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
