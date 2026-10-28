// app/api/admin/users/route.ts
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
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      farmName: true,
      address: true,
      createdAt: true,
      _count: { select: { orders: true, products: true } },
    },
  })
  return NextResponse.json(users)
}

export async function PATCH(req: Request) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const { id, role } = body

    const targetId = parseInt(id)
    if (isNaN(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Valid user ID is required" }, { status: 400 })
    }

    const validRoles = ["CUSTOMER", "FARMER", "ARTISAN", "ADMIN"]
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: `Valid role is required (${validRoles.join(", ")})` }, { status: 400 })
    }

    // Safety: Prevent admin from accidentally demoting their own account
    if (targetId === parseInt(session.user.id) && role !== "ADMIN") {
      return NextResponse.json({ error: "You cannot remove admin privileges from your own account." }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PATCH /api/admin/users]", error)
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const { id } = body

    const targetId = parseInt(id)
    if (isNaN(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Valid user ID is required" }, { status: 400 })
    }

    // CRITICAL SECURITY: Admin cannot delete their own active account
    if (targetId === parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Administrators cannot delete their own critical account." },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        _count: { select: { orders: true, products: true } },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Retain order history integrity: check if user has placed orders
    if (targetUser._count.orders > 0) {
      return NextResponse.json(
        {
          error: `User has ${targetUser._count.orders} associated order records. Accounts with historical order invoices cannot be hard deleted.`,
        },
        { status: 400 }
      )
    }

    // Delete associated cart items and products safely if no active orders
    await prisma.cartItem.deleteMany({ where: { userId: targetId } })
    await prisma.product.deleteMany({ where: { farmerId: targetId } })
    await prisma.user.delete({ where: { id: targetId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/admin/users]", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
