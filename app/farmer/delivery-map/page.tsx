"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Navigation, Leaf, ArrowLeft, Clock, IndianRupee, ShieldCheck } from "lucide-react"

// Dynamic import to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/delivery-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      Loading delivery map...
    </div>
  ),
})

import { useLanguage } from "@/lib/LanguageContext"

export default function DeliveryMapPage() {
  const { t } = useLanguage()
  const [routeData, setRouteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/route-optimize")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setRouteData(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setError(t("Failed to load route data. Please try again."))
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center font-medium text-muted-foreground">
      {t("Calculating optimal road delivery route...")}
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center relative">
      <Link
        href="/farmer"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-[#6B8E23] rounded-lg px-3 py-1.5 bg-background shadow-xs"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <div className="rounded-full bg-muted p-6">
        <Navigation className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">{t("Delivery map unavailable")}</h2>
      <p className="max-w-sm text-muted-foreground">
        {error === "Farmer location not set"
          ? t("Your farm location hasn't been set yet. Set it in your profile so the route optimizer knows where deliveries start from.")
          : error}
      </p>
      <div className="flex gap-3">
        {error === "Farmer location not set" && (
          <Link href="/profile">
            <Button className="gap-2">
              <Navigation className="h-4 w-4" />
              {t("Set My Location")}
            </Button>
          </Link>
        )}
        <Link href="/farmer">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )

  const stops = routeData?.stops ?? routeData?.clusters?.[0]?.stops ?? []

  return (
    <div className="min-h-screen pb-12">
      <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 flex items-center justify-between">
          <div>
            <Link
              href="/farmer"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("Back to Dashboard")}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{t("Delivery Route Optimization")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Real road-network routing and multi-stop delivery plan")}
            </p>
          </div>
          <Link href="/farmer">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("Close Map")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Metric Cards Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Navigation className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("Road Distance")}</p>
                <p className="text-xl font-bold">{routeData?.totalDistance ?? "0"} {t("km")}</p>
                <p className="text-xs text-muted-foreground">vs {routeData?.baselineDistance ?? "0"} {t("km")} baseline</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("Est. Driving Time")}</p>
                <p className="text-xl font-bold">{routeData?.travelTimeFormatted?.replace('mins', t('mins')) ?? `0 ${t('mins')}`}</p>
                <p className="text-xs text-muted-foreground">{stops.length} {t("physical stops")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <IndianRupee className="h-8 w-8 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("Delivery Cost")}</p>
                <p className="text-xl font-bold">₹{routeData?.totalCost ?? 0}</p>
                <p className="text-xs text-emerald-600 font-semibold">{t("Saved")} ₹{routeData?.costSaved ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Leaf className="h-8 w-8 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("CO₂ Emissions")}</p>
                <p className="text-xl font-bold">{routeData?.totalCo2 ?? "0"} {t("kg")}</p>
                <p className="text-xs text-emerald-600 font-semibold">{t("Saved")} {routeData?.co2Saved ?? "0"} {t("kg")} CO₂</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Warning Alert */}
        {routeData?.locationWarning && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 flex items-center gap-2">
            <span>⚠️ {routeData.locationWarning}</span>
          </div>
        )}

        {/* Assumptions banner */}
        <div className="mb-6 rounded-lg border border-[#6B8E23] bg-card p-4 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 items-center">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t("Model Metrics & Assumptions:")}
          </span>
          <span>• {t("Cost:")} {routeData?.costPerKmAssumption ?? "₹12/km"}</span>
          <span>• {t("Emissions:")} {routeData?.co2FactorAssumption ?? "0.15 kg CO₂/km"}</span>
          <span>• {t("Per-Order Distance:")} {routeData?.perOrderDistance ? `${routeData.perOrderDistance} km` : "N/A"}</span>
          <span>• {t("Per-Kg CO₂:")} {routeData?.perKgCo2 ? `${routeData.perKgCo2} kg` : "N/A"}</span>
        </div>

        {/* Map Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{t("Road Delivery Map")}</span>
              <span className="text-xs font-normal text-muted-foreground">{t("OSRM Road Geometry")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapComponent routeData={routeData} />
          </CardContent>
        </Card>

        {/* Delivery Stops List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("Physical Delivery Stops")} ({stops.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stops.map((stop: any, si: number) => (
                <div
                  key={stop.stopId || si}
                  className="flex items-center gap-4 rounded-lg border border-[#6B8E23] p-4 bg-background shadow-xs hover:border-primary/50 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-xs">
                    {stop.stopIndex ?? si + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                      {stop.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{stop.address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">₹{stop.total}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {stop.orderIds
                        ? stop.orderIds.map((id: number) => `ORD-${String(id).padStart(3, "0")}`).join(", ")
                        : `ORD-${String(stop.orderId).padStart(3, "0")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {stops.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("No routable pending orders at this time.")}</p>
            )}
          </CardContent>
        </Card>

        {/* Unmapped Orders */}
        {routeData?.unmappedOrders?.length > 0 && (
          <Card className="mt-6 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-700 dark:text-amber-400 text-base">
                {t("Orders Missing Delivery Coordinates")} ({routeData.unmappedOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("These orders cannot be added to road routing until the customer provides a valid delivery address/location.")}
              </p>
              <div className="space-y-3">
                {routeData.unmappedOrders.map((order: any) => (
                  <div
                    key={order.orderId}
                    className="flex items-center gap-4 rounded-lg border border-amber-200 bg-background p-3 dark:border-amber-800"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      ?
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.address || t("No address on file")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₹{order.total}</p>
                      <p className="text-xs text-muted-foreground">
                        ORD-{String(order.orderId).padStart(3, "0")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}