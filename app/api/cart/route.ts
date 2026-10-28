import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"

const MAX_ITEM_QUANTITY = 100

// ─── GET /api/cart ────────────────────────────────────────────────────────────
// Returns all cart items for the logged-in user.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const items = await prisma.cartItem.findMany({
    where: { userId },
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
// Enforces strict positive integer quantities and stock constraints.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { productId, quantity = 1 } = body

    // 1. Strict positive integer validation
    const pId = parseInt(productId)
    if (isNaN(pId) || pId <= 0) {
      return NextResponse.json({ error: "A valid positive productId is required" }, { status: 400 })
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY
    ) {
      return NextResponse.json(
        { error: `Quantity must be a positive integer between 1 and ${MAX_ITEM_QUANTITY}` },
        { status: 400 }
      )
    }

    // 2. Fetch product stock
    const product = await prisma.product.findUnique({
      where: { id: pId },
      select: { id: true, stock: true, name: true, price: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (product.stock < 1) {
      return NextResponse.json({ error: `"${product.name}" is currently out of stock.` }, { status: 400 })
    }

    // 3. Check existing quantity in cart
    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId: pId } },
      select: { id: true, quantity: true },
    })

    const currentQty = existing?.quantity ?? 0
    const desiredTotalQty = currentQty + quantity

    if (desiredTotalQty > product.stock) {
      return NextResponse.json(
        {
          error: `Cannot add ${quantity} more. You already have ${currentQty} in cart, and only ${product.stock} units are in stock.`,
        },
        { status: 400 }
      )
    }

    if (desiredTotalQty > MAX_ITEM_QUANTITY) {
      return NextResponse.json(
        { error: `Maximum limit of ${MAX_ITEM_QUANTITY} units reached for this item.` },
        { status: 400 }
      )
    }

    // 4. Upsert item
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
  } catch (err) {
    console.error("[POST /api/cart]", err)
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 })
  }
}

// ─── DELETE /api/cart ─────────────────────────────────────────────────────────
// Removes a cart item by its ID. Verifies ownership.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { id } = body

    const cartItemId = parseInt(id)
    if (isNaN(cartItemId) || cartItemId <= 0) {
      return NextResponse.json({ error: "A valid cart item ID is required" }, { status: 400 })
    }

    // Ownership check
    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } })
    if (!item || item.userId !== userId) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/cart]", err)
    return NextResponse.json({ error: "Failed to remove cart item" }, { status: 500 })
  }
}

// ─── PATCH /api/cart ──────────────────────────────────────────────────────────
// Sets an exact quantity on a cart item.
// Strict integer and stock bounds validation.
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = parseInt(session.user.id)
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { id, quantity } = body

    const cartItemId = parseInt(id)
    if (isNaN(cartItemId) || cartItemId <= 0) {
      return NextResponse.json({ error: "A valid cart item ID is required" }, { status: 400 })
    }

    if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: "Quantity must be an integer" }, { status: 400 })
    }

    // Ownership check & product stock fetch
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: { select: { stock: true, name: true } } },
    })

    if (!item || item.userId !== userId) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    // quantity <= 0 → delete row
    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } })
      return NextResponse.json({ deleted: true })
    }

    if (quantity > item.product.stock) {
      return NextResponse.json(
        { error: `Requested quantity exceeds available stock (${item.product.stock} available)` },
        { status: 400 }
      )
    }

    if (quantity > MAX_ITEM_QUANTITY) {
      return NextResponse.json(
        { error: `Maximum quantity per item is ${MAX_ITEM_QUANTITY}` },
        { status: 400 }
      )
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItemId },
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
  } catch (err) {
    console.error("[PATCH /api/cart]", err)
    return NextResponse.json({ error: "Failed to update cart quantity" }, { status: 500 })
  }
}
