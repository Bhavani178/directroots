import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"
import { hasConfirmedLocation } from "@/lib/location"

// Cost and CO2 constants based on documented transport assumptions
const COST_PER_KM = 12 // ₹12 per km assumption (fuel + vehicle wear & tear)
const CO2_PER_KM = 0.15 // 0.15 kg CO2 per km (light commercial vehicle emission factor)

// Helper for permutation generation (for exact TSP on small N)
function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const result: T[][] = []
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i]
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)]
    const remainingPerms = getPermutations(remaining)
    for (const perm of remainingPerms) {
      result.push([current, ...perm])
    }
  }
  return result
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const farmerId = parseInt(session.user.id)

  const farmer = await prisma.user.findUnique({
    where: { id: farmerId },
  })

  if (!farmer?.lat || !farmer?.lng) {
    return NextResponse.json({ error: "Farmer location not set" }, { status: 400 })
  }

  const farmerLoc = { lat: farmer.lat, lng: farmer.lng }

  // Get pending orders containing products from this farmer
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] },
      items: {
        some: {
          product: { farmerId },
        },
      },
    },
    include: {
      user: true,
      items: { include: { product: true } },
    },
    orderBy: { id: "asc" },
  })

  // Group orders into unique physical delivery destinations
  // One unique physical delivery address/location = one stop
  const stopsMap = new Map<string, any>()
  const unmappedOrders: any[] = []

  for (const o of orders) {
    const userHasConfirmed = hasConfirmedLocation(o.user)
    const lat = userHasConfirmed ? o.user.lat! : (o.deliveryLat ?? o.user.lat)
    const lng = userHasConfirmed ? o.user.lng! : (o.deliveryLng ?? o.user.lng)
    const address = (userHasConfirmed && o.user.address) ? o.user.address : (o.deliveryAddress ?? o.user.address ?? "No address on file")
    const customerName = o.user.name

    const orderDetail = {
      orderId: o.id,
      customerName,
      address,
      total: o.total,
    }

    if (!lat || !lng) {
      unmappedOrders.push(orderDetail)
      continue
    }

    // Unique stop key based on exact physical coordinates
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`

    if (stopsMap.has(key)) {
      const existing = stopsMap.get(key)
      existing.orderIds.push(o.id)
      existing.orders.push(orderDetail)
      existing.total = Math.round((existing.total + o.total) * 100) / 100
      if (!existing.customerName.includes(customerName)) {
        existing.customerName += `, ${customerName}`
      }
    } else {
      stopsMap.set(key, {
        lat,
        lng,
        customerName,
        address,
        total: o.total,
        orderIds: [o.id],
        orders: [orderDetail],
      })
    }
  }

  const rawStops = Array.from(stopsMap.values())

  if (rawStops.length === 0) {
    return NextResponse.json({
      farmerLocation: farmerLoc,
      farmerAddress: farmer.address ?? "Your farm",
      stops: [],
      clusters: [],
      geometry: null,
      unmappedOrders,
      totalOrders: orders.length,
      totalStops: 0,
      totalDistance: "0.00",
      travelTimeMinutes: 0,
      travelTimeFormatted: "0 mins",
      totalCost: 0,
      costSaved: 0,
      totalCo2: "0.00",
      co2Saved: "0.00",
      baselineDistance: "0.00",
      costPerKmAssumption: `₹${COST_PER_KM}/km (fuel & maintenance)`,
      co2FactorAssumption: `${CO2_PER_KM} kg CO₂/km (light commercial vehicle)`,
    })
  }

  // Request OSRM Matrix for Farm + Stops
  // Index 0 = Farm, Index 1..N = Stops
  const allPoints = [farmerLoc, ...rawStops]
  const coordsString = allPoints.map((p) => `${p.lng},${p.lat}`).join(";")

  let matrixDistances: number[][] = []
  let matrixDurations: number[][] = []

  try {
    const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coordsString}?annotations=distance,duration`
    const tableRes = await fetch(tableUrl, { headers: { "User-Agent": "DirectRoots/1.0" } })
    if (tableRes.ok) {
      const tableData = await tableRes.json()
      if (tableData.code === "Ok") {
        matrixDistances = tableData.distances
        matrixDurations = tableData.durations
      }
    }
  } catch (err) {
    console.error("OSRM table request failed:", err)
  }

  const N = rawStops.length
  let optimalOrderIndices: number[] = [] // 1-indexed into allPoints (0 is farm)

  if (matrixDistances.length > 0 && matrixDistances.length === allPoints.length) {
    // Solve TSP using matrix distances
    const stopIndices = Array.from({ length: N }, (_, i) => i + 1)

    if (N <= 8) {
      // Evaluate all permutations for exact optimal sequence
      const perms = getPermutations(stopIndices)
      let minDistance = Infinity
      let bestPerm = stopIndices

      for (const perm of perms) {
        let currentDist = matrixDistances[0][perm[0]]
        for (let i = 0; i < perm.length - 1; i++) {
          currentDist += matrixDistances[perm[i]][perm[i + 1]]
        }
        currentDist += matrixDistances[perm[perm.length - 1]][0]

        if (currentDist < minDistance) {
          minDistance = currentDist
          bestPerm = perm
        }
      }
      optimalOrderIndices = bestPerm
    } else {
      // Nearest neighbor approach for larger N
      const unvisited = new Set(stopIndices)
      let curr = 0
      while (unvisited.size > 0) {
        let nearest = -1
        let minDist = Infinity
        for (const idx of Array.from(unvisited)) {
          const d = matrixDistances[curr][idx]
          if (d < minDist) {
            minDist = d
            nearest = idx
          }
        }
        optimalOrderIndices.push(nearest)
        unvisited.delete(nearest)
        curr = nearest
      }
    }
  } else {
    // Fallback sequential order
    optimalOrderIndices = Array.from({ length: N }, (_, i) => i + 1)
  }

  // Ordered stops
  const orderedStops = optimalOrderIndices.map((idx, sequenceNum) => ({
    stopId: `stop-${sequenceNum + 1}`,
    stopIndex: sequenceNum + 1,
    ...rawStops[idx - 1],
  }))

  // Construct full route coordinate string for OSRM Route API
  // Farm -> Stop 1 -> Stop 2 -> ... -> Stop N -> Farm
  const routePoints = [farmerLoc, ...orderedStops.map((s) => ({ lat: s.lat, lng: s.lng })), farmerLoc]
  const routeCoordsString = routePoints.map((p) => `${p.lng},${p.lat}`).join(";")

  let routeGeometry: any = null
  let totalDistanceMeters = 0
  let totalDurationSeconds = 0

  try {
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${routeCoordsString}?overview=full&geometries=geojson&steps=true`
    const routeRes = await fetch(routeUrl, { headers: { "User-Agent": "DirectRoots/1.0" } })
    if (routeRes.ok) {
      const routeData = await routeRes.json()
      if (routeData.code === "Ok" && routeData.routes?.length > 0) {
        routeGeometry = routeData.routes[0].geometry
        totalDistanceMeters = routeData.routes[0].distance
        totalDurationSeconds = routeData.routes[0].duration
      }
    }
  } catch (err) {
    console.error("OSRM route request failed:", err)
  }

  // Check if any stop is within 100m (0.1 km) of the farm location
  let locationWarning: string | null = null
  const haversineDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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

  for (const s of rawStops) {
    if (haversineDist(farmerLoc.lat, farmerLoc.lng, s.lat, s.lng) <= 0.1) {
      locationWarning = "Farm and delivery stop are within 100m of each other"
      break
    }
  }

  const totalDistanceKm = totalDistanceMeters / 1000
  const travelTimeMinutes = Math.round(totalDurationSeconds / 60)

  // Format travel time cleanly
  const hours = Math.floor(travelTimeMinutes / 60)
  const mins = travelTimeMinutes % 60
  const travelTimeFormatted =
    totalDistanceKm === 0 ? "N/A" : hours > 0 ? `${hours} hr ${mins} min` : `${mins} mins`

  // Calculate Baseline Distance (individual round trips for each stop)
  let baselineDistanceMeters = 0
  if (matrixDistances.length > 0 && matrixDistances.length === allPoints.length) {
    for (let i = 1; i <= N; i++) {
      baselineDistanceMeters += matrixDistances[0][i] + matrixDistances[i][0]
    }
  } else {
    baselineDistanceMeters = totalDistanceMeters * 1.5
  }
  const baselineDistanceKm = baselineDistanceMeters / 1000

  // Financial and Environmental Metrics
  const totalCost = Math.round(totalDistanceKm * COST_PER_KM)
  const baselineCost = Math.round(baselineDistanceKm * COST_PER_KM)
  const costSaved = Math.max(0, baselineCost - totalCost)

  const totalCo2Num = totalDistanceKm * CO2_PER_KM
  const baselineCo2Num = baselineDistanceKm * CO2_PER_KM
  const co2SavedNum = Math.max(0, baselineCo2Num - totalCo2Num)

  // Per-order and per-kg metrics (null if totalDistanceKm === 0)
  const perOrderDistance =
    totalDistanceKm > 0 && orderedStops.length > 0
      ? (totalDistanceKm / orderedStops.length).toFixed(2)
      : null

  const perKgCo2 =
    totalDistanceKm > 0 ? (totalCo2Num / (orderedStops.length * 10)).toFixed(3) : null

  return NextResponse.json({
    farmerLocation: farmerLoc,
    farmerAddress: farmer.address ?? "Your farm",
    stops: orderedStops,
    clusters: [
      {
        stops: orderedStops,
        geometry: routeGeometry,
      },
    ],
    geometry: routeGeometry,
    unmappedOrders,
    locationWarning,
    totalOrders: orders.length,
    totalStops: orderedStops.length,
    totalDistance: totalDistanceKm.toFixed(2),
    baselineDistance: baselineDistanceKm.toFixed(2),
    travelTimeMinutes: totalDistanceKm === 0 ? null : travelTimeMinutes,
    travelTimeFormatted,
    perOrderDistance,
    perKgCo2,
    totalCost: totalDistanceKm === 0 ? 0 : totalCost,
    costSaved: totalDistanceKm === 0 ? 0 : costSaved,
    totalCo2: totalDistanceKm === 0 ? "0.00" : totalCo2Num.toFixed(2),
    co2Saved: totalDistanceKm === 0 ? "0.00" : co2SavedNum.toFixed(2),
    costPerKmAssumption: `₹${COST_PER_KM}/km (fuel & maintenance)`,
    co2FactorAssumption: `${CO2_PER_KM} kg CO₂/km (light commercial vehicle)`,
  })
}