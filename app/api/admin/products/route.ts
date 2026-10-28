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
  if (!(await checkAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const products = await prisma.product.findMany({
    include: { farmer: { select: { id: true, name: true, farmName: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(products)
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const { name, category, price, unit, stock, description, imageUrl, isOrganic, isHandmade, craftType, farmerId } = body

    if (!name || !category || price === undefined || !farmerId) {
      return NextResponse.json({ error: "name, category, price, and farmerId are required" }, { status: 400 })
    }

    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 })
    }

    const parsedStock = parseInt(stock ?? 0)
    if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      return NextResponse.json({ error: "Stock must be a non-negative integer" }, { status: 400 })
    }

    const parsedFarmerId = parseInt(farmerId)
    if (isNaN(parsedFarmerId) || parsedFarmerId <= 0) {
      return NextResponse.json({ error: "Valid farmerId is required" }, { status: 400 })
    }

    // Verify farmer exists
    const farmer = await prisma.user.findUnique({ where: { id: parsedFarmerId } })
    if (!farmer) {
      return NextResponse.json({ error: "Specified producer does not exist" }, { status: 404 })
    }

    const product = await prisma.product.create({
      data: {
        name: String(name).trim().slice(0, 150),
        category: String(category).trim().slice(0, 50),
        price: parsedPrice,
        unit: unit ? String(unit).trim().slice(0, 20) : "kg",
        stock: parsedStock,
        description: description ? String(description).trim().slice(0, 2000) : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        isOrganic: Boolean(isOrganic),
        isHandmade: Boolean(isHandmade),
        craftType: craftType ? String(craftType).trim().slice(0, 50) : null,
        farmerId: parsedFarmerId,
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/products]", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const { id, ...data } = body

    const targetId = parseInt(id)
    if (isNaN(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Valid product ID is required" }, { status: 400 })
    }

    if (data.price !== undefined) {
      const parsedPrice = parseFloat(data.price)
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 })
      }
    }

    if (data.stock !== undefined) {
      const parsedStock = parseInt(data.stock)
      if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
        return NextResponse.json({ error: "Stock must be a non-negative integer" }, { status: 400 })
      }
    }

    const product = await prisma.product.update({
      where: { id: targetId },
      data: {
        ...(data.name        !== undefined && { name: String(data.name).trim().slice(0, 150) }),
        ...(data.price       !== undefined && { price: parseFloat(data.price) }),
        ...(data.stock       !== undefined && { stock: parseInt(data.stock) }),
        ...(data.category    !== undefined && { category: String(data.category).trim().slice(0, 50) }),
        ...(data.unit        !== undefined && { unit: String(data.unit).trim().slice(0, 20) }),
        ...(data.imageUrl    !== undefined && { imageUrl: data.imageUrl ? String(data.imageUrl).trim() : null }),
        ...(data.isOrganic   !== undefined && { isOrganic: Boolean(data.isOrganic) }),
        ...(data.description !== undefined && { description: data.description ? String(data.description).trim().slice(0, 2000) : null }),
      },
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error("[PATCH /api/admin/products]", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const { id } = body

    const targetId = parseInt(id)
    if (isNaN(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Valid product ID is required" }, { status: 400 })
    }

    // Safety: Retain order receipts for items with purchase history
    const orderCount = await prisma.orderItem.count({ where: { productId: targetId } })
    if (orderCount > 0) {
      await prisma.cartItem.deleteMany({ where: { productId: targetId } })
      await prisma.product.update({
        where: { id: targetId },
        data: { stock: 0 },
      })
      return NextResponse.json({
        success: true,
        archived: true,
        message: "Product has associated order history. It has been archived with 0 stock to protect customer order records.",
      })
    }

    await prisma.cartItem.deleteMany({ where: { productId: targetId } })
    await prisma.product.delete({ where: { id: targetId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/admin/products]", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
