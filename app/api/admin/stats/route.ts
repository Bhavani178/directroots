// app/api/admin/stats/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [totalOrders, totalUsers, totalProducts, totalFarmers, recentOrders, revenue] = await Promise.all([
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count(),
    prisma.user.count({ where: { role: { in: ["FARMER", "ARTISAN"] } } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, items: true },
    }),
    prisma.order.aggregate({ _sum: { total: true } }),
  ])

  return NextResponse.json({
    totalOrders,
    totalUsers,
    totalProducts,
    totalFarmers,
    totalRevenue: revenue._sum.total ?? 0,
    recentOrders,
  })
}
