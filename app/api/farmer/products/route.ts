import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../../auth/[...nextauth]/route"

// ─── GET /api/farmer/products ─────────────────────────────────────────────────
// Returns only products owned by the logged-in FARMER or ARTISAN.
// Used by the farmer dashboard so it never sees another producer's products.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "FARMER" && session.user.role !== "ARTISAN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const products = await prisma.product.findMany({
    where: { farmerId: parseInt(session.user.id) },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(products)
}
