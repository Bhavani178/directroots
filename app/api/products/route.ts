import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"
import { MAX_FARM_DELIVERY_KM, kmToDegreeDelta } from "@/lib/config"
import { hasConfirmedLocation } from "@/lib/location"

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── GET /api/products ────────────────────────────────────────────────────────
// Public endpoint with 50km seller service radius enforcement.
// Supports query params:
//   ?category=Vegetables
//   ?search=tomato
//   ?farmerId=3
//   ?lat=15.36&lng=75.12
//   ?organic=true
//   ?handmade=true
//   ?sort=newest|price_asc|price_desc|nearest
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category  = searchParams.get("category")
  const search    = searchParams.get("search")
  const farmerIdQ = searchParams.get("farmerId")
  const rawLat    = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null
  const rawLng    = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null
  let lat         = (rawLat !== null && !isNaN(rawLat) && rawLat >= -90 && rawLat <= 90) ? rawLat : null
  let lng         = (rawLng !== null && !isNaN(rawLng) && rawLng >= -180 && rawLng <= 180) ? rawLng : null
  const organic   = searchParams.get("organic") === "true"
  const handmade  = searchParams.get("handmade") === "true"
  const sort      = searchParams.get("sort") ?? "nearest"

  // If customer lat/lng not provided in query params, try retrieving from logged-in user profile
  const session = await getServerSession(authOptions)
  if ((lat === null || lng === null) && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { lat: true, lng: true },
    })
    if (user && hasConfirmedLocation(user)) {
      lat = user.lat!
      lng = user.lng!
    }
  }

  // Default to Bidar regional hub coordinates if customer coordinates not provided
  if (lat === null || lng === null) {
    lat = 17.9104
    lng = 77.5199
  }

  const rawPage  = parseInt(searchParams.get("page") || "1")
  const page     = (!isNaN(rawPage) && rawPage > 0) ? rawPage : 1
  const rawLimit = parseInt(searchParams.get("limit") || "300")
  const limit    = (!isNaN(rawLimit) && rawLimit > 0 && rawLimit <= 500) ? rawLimit : 300
  const skip     = (page - 1) * limit

  const conditions: Prisma.Sql[] = [Prisma.sql`1=1`]

  if (category && category !== "All") {
    if (category === "Organic") {
      conditions.push(Prisma.sql`p."isOrganic" = true`)
    } else if (category === "Handlooms") {
      conditions.push(Prisma.sql`(p."category" = 'Handlooms' OR p."craftType" = 'Textile')`)
    } else if (category === "Handicrafts") {
      conditions.push(Prisma.sql`(p."category" = 'Handicrafts' OR p."category" = 'Handmade Crafts')`)
    } else if (category === "Village Products") {
      conditions.push(Prisma.sql`p."category" IN ('Village Products', 'Oils & Honey', 'Pickles & Processed')`)
    } else if (category === "Grains & Pulses") {
      conditions.push(Prisma.sql`p."category" IN ('Grains & Pulses', 'Grains & Cereals')`)
    } else if (category === "Spices & Herbs") {
      conditions.push(Prisma.sql`p."category" IN ('Spices & Herbs', 'Spices')`)
    } else {
      conditions.push(Prisma.sql`p."category" = ${category.slice(0, 50)}`)
    }
  }
  if (farmerIdQ) {
    const fId = parseInt(farmerIdQ)
    if (!isNaN(fId) && fId > 0) {
      conditions.push(Prisma.sql`p."farmerId" = ${fId}`)
    }
  }
  if (organic) conditions.push(Prisma.sql`p."isOrganic" = true`)
  if (handmade) conditions.push(Prisma.sql`p."isHandmade" = true`)
  if (search) {
    const cleanSearch = search.trim().slice(0, 100)
    if (cleanSearch) {
      const searchPattern = `%${cleanSearch}%`
      conditions.push(Prisma.sql`(
        p."name" ILIKE ${searchPattern} OR 
        p."description" ILIKE ${searchPattern} OR 
        u."farmName" ILIKE ${searchPattern} OR 
        u."name" ILIKE ${searchPattern}
      )`)
    }
  }

  let distanceSelect = Prisma.empty
  let orderByClause = Prisma.sql`ORDER BY p."createdAt" DESC`

  if (lat !== null && lng !== null) {
    // Clamp the value inside acos to [-1, 1] to prevent domain errors
    distanceSelect = Prisma.sql`, (6371 * acos(
      GREATEST(-1.0, LEAST(1.0, 
        cos(radians(${lat})) * cos(radians(u."lat")) * cos(radians(u."lng") - radians(${lng})) + 
        sin(radians(${lat})) * sin(radians(u."lat"))
      ))
    )) AS "distanceKm"`

    if (sort === "nearest") orderByClause = Prisma.sql`ORDER BY "distanceKm" ASC`
    else if (sort === "price_asc") orderByClause = Prisma.sql`ORDER BY p."price" ASC`
    else if (sort === "price_desc") orderByClause = Prisma.sql`ORDER BY p."price" DESC`
  }

  const whereClause = Prisma.join(conditions, ' AND ')

  // Execute raw query with pagination and distance math fully in Postgres
  const rawProducts = await prisma.$queryRaw<any[]>`
    SELECT 
      p.*,
      u.id AS "f_id",
      u.name AS "f_name",
      u."farmName" AS "f_farmName",
      u."profileImage" AS "f_profileImage",
      u.lat AS "f_lat",
      u.lng AS "f_lng",
      u.address AS "f_address"
      ${distanceSelect}
    FROM "Product" p
    JOIN "User" u ON p."farmerId" = u.id
    WHERE ${whereClause}
    ${orderByClause}
    LIMIT ${limit} OFFSET ${skip}
  `

  // Map back to the expected Prisma nested object shape for the frontend
  let paginated = rawProducts.map(row => ({
    id: row.id,
    farmerId: row.farmerId,
    name: row.name,
    description: row.description,
    price: row.price,
    stock: row.stock,
    imageUrl: row.imageUrl,
    category: row.category,
    unit: row.unit,
    harvestDate: row.harvestDate,
    isOrganic: row.isOrganic,
    isHandmade: row.isHandmade,
    craftType: row.craftType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    distanceKm: row.distanceKm != null ? parseFloat(row.distanceKm.toFixed(2)) : null,
    farmer: {
      id: row.f_id,
      name: row.f_name,
      farmName: row.f_farmName || row.f_name,
      profileImage: row.f_profileImage,
    }
  }))



  return NextResponse.json(paginated)
}

// ─── POST /api/products ───────────────────────────────────────────────────────
// Protected: FARMER or ARTISAN only.
// farmerId is derived from the session — never from the client.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "FARMER" && session.user.role !== "ARTISAN") {
    return NextResponse.json({ error: "Only farmers and artisans can list products" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      name, description, price, stock, imageUrl,
      category, unit, harvestDate, isOrganic,
      isHandmade, craftType,
    } = body

    // Verify farmer has confirmed location
    const farmer = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { lat: true, lng: true },
    })

    if (!hasConfirmedLocation(farmer)) {
      return NextResponse.json(
        { error: "Please set and confirm your farm location on your profile map before listing products." },
        { status: 400 }
      )
    }

    // Basic validation
    if (!name?.trim())    return NextResponse.json({ error: "Product name is required" }, { status: 400 })
    if (!category?.trim()) return NextResponse.json({ error: "Category is required" }, { status: 400 })
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0)
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 })
    if (isNaN(parseInt(stock)) || parseInt(stock) < 0)
      return NextResponse.json({ error: "Valid stock quantity is required" }, { status: 400 })

    const product = await prisma.product.create({
      data: {
        farmerId:    parseInt(session.user.id), // ← real FK, not hardcoded string
        name:        name.trim(),
        description: description?.trim() || null,
        price:       parseFloat(price),
        stock:       parseInt(stock),
        imageUrl:    imageUrl?.trim() || null,
        category:    category.trim(),
        unit:        unit?.trim() || "kg",
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        isOrganic:   Boolean(isOrganic),
        isHandmade:  Boolean(isHandmade),
        craftType:   craftType?.trim() || null,
      },
      include: {
        farmer: {
          select: { id: true, name: true, farmName: true, profileImage: true, lat: true, lng: true },
        },
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("[POST /api/products]", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}