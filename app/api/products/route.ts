import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const products = await prisma.product.findMany()

  return NextResponse.json(products)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: parseFloat(body.price),
        stock: parseInt(body.stock),
        imageUrl: body.imageUrl || "",
        category: body.category,
        farmerName: "Demo Farmer",
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}