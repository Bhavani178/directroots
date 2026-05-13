"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Navigation, Leaf } from "lucide-react"

// Dynamic import to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/delivery-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-lg bg-muted">
      Loading map...
    </div>
  ),
})

export default function DeliveryMapPage() {
  const [routeData, setRouteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/route-optimize")
      .then((r) => r.json())
      .then((data) => {
        setRouteData(data)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      Calculating optimal route...
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Delivery Route</h1>
          <p className="mt-2 text-muted-foreground">
            Optimized eco-friendly delivery plan
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{routeData?.totalOrders ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Navigation className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-bold">{routeData?.totalDistance ?? "0"} km</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Leaf className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">CO₂ Saved</p>
                <p className="text-2xl font-bold text-green-600">
                  {routeData?.co2Saved ?? "0"} kg
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Delivery Map</CardTitle>
          </CardHeader>
          <CardContent>
            <MapComponent routeData={routeData} />
          </CardContent>
        </Card>

        {/* Delivery stops list */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Stops</CardTitle>
          </CardHeader>
          <CardContent>
            {routeData?.clusters?.map((cluster: any, ci: number) => (
              <div key={ci} className="mb-6">
                <h3 className="mb-3 font-semibold text-primary">
                  Zone {ci + 1} — {cluster.stops.length} stops
                </h3>
                <div className="space-y-3">
                  {cluster.stops.map((stop: any, si: number) => (
                    <div
                      key={si}
                      className="flex items-center gap-4 rounded-lg border border-border p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {si + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stop.customerName}</p>
                        <p className="text-sm text-muted-foreground">{stop.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{stop.total}</p>
                        <p className="text-xs text-muted-foreground">
                          ORD-{String(stop.orderId).padStart(3, "0")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}