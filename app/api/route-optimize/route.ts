import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "../auth/[...nextauth]/route"

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

// DBSCAN clustering
function dbscan(points: any[], epsilon: number, minPts: number) {
  const clusters: any[][] = []
  const visited = new Set<number>()
  const noise = new Set<number>()

  function rangeQuery(idx: number) {
    return points.filter((_, i) =>
      haversine(points[idx].lat, points[idx].lng, points[i].lat, points[i].lng) <= epsilon
    )
  }

  points.forEach((_, i) => {
    if (visited.has(i)) return
    visited.add(i)
    const neighbors = rangeQuery(i)

    if (neighbors.length < minPts) {
      noise.add(i)
      return
    }

    const cluster: any[] = []
    const queue = [...neighbors]

    while (queue.length > 0) {
      const point = queue.shift()!
      const pi = points.indexOf(point)
      if (!visited.has(pi)) {
        visited.add(pi)
        const newNeighbors = rangeQuery(pi)
        if (newNeighbors.length >= minPts) queue.push(...newNeighbors)
      }
      if (!clusters.flat().includes(point)) cluster.push(point)
    }
    clusters.push(cluster)
  })

  // Add noise points as individual clusters
  noise.forEach((i) => clusters.push([points[i]]))
  return clusters
}

// Greedy TSP — nearest neighbor
function greedyTSP(start: { lat: number; lng: number }, points: any[]) {
  const unvisited = [...points]
  const route: any[] = []
  let current = start

  while (unvisited.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity

    unvisited.forEach((p, i) => {
      const d = haversine(current.lat, current.lng, p.lat, p.lng)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    })

    route.push(unvisited[nearestIdx])
    current = unvisited[nearestIdx]
    unvisited.splice(nearestIdx, 1)
  }

  return route
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get farmer location
  const farmer = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
  })

  if (!farmer?.lat || !farmer?.lng) {
    return NextResponse.json({ error: "Farmer location not set" }, { status: 400 })
  }

  // Get pending orders with customer locations
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY"] } },
    include: {
      user: true,
      items: { include: { product: true } },
    },
  })

  // Filter orders where customer has lat/lng
  const deliveryPoints = orders
    .filter((o) => o.user.lat && o.user.lng)
    .map((o) => ({
      orderId: o.id,
      customerName: o.user.name,
      address: o.user.address ?? "",
      lat: o.user.lat!,
      lng: o.user.lng!,
      total: o.total,
    }))

  if (deliveryPoints.length === 0) {
    return NextResponse.json({
      farmerLocation: { lat: farmer.lat, lng: farmer.lng },
      farmerAddress: farmer.address ?? "Your farm",
      clusters: [],
      totalOrders: 0,
      totalDistance: "0",
      co2Saved: "0",
    })
  }

  // Step 1 — DBSCAN clustering (2km radius, min 1 point)
  const rawClusters = dbscan(deliveryPoints, 2, 1)

  // Step 2 — Greedy TSP per cluster
  const farmerLocation = { lat: farmer.lat, lng: farmer.lng }

  let totalDistance = 0

  const clusters = rawClusters.map((cluster) => {
    const stops = greedyTSP(farmerLocation, cluster)

    // Calculate cluster distance
    let dist = haversine(farmerLocation.lat, farmerLocation.lng, stops[0].lat, stops[0].lng)
    for (let i = 0; i < stops.length - 1; i++) {
      dist += haversine(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng)
    }
    dist += haversine(stops[stops.length - 1].lat, stops[stops.length - 1].lng, farmerLocation.lat, farmerLocation.lng)
    totalDistance += dist

    return { stops, distance: dist.toFixed(2) }
  })

  // CO2 saved vs individual trips (each order delivered separately)
  const individualDistance = deliveryPoints.reduce((sum, p) => {
    return sum + haversine(farmerLocation.lat, farmerLocation.lng, p.lat, p.lng) * 2
  }, 0)
  const co2Saved = ((individualDistance - totalDistance) * 0.21).toFixed(2)

  return NextResponse.json({
    farmerLocation: { lat: farmer.lat, lng: farmer.lng },
    farmerAddress: farmer.address ?? "Your farm",
    clusters,
    totalOrders: deliveryPoints.length,
    totalDistance: totalDistance.toFixed(2),
    co2Saved: co2Saved,
  })
}