"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { useSession } from "next-auth/react"
import { Package, ChefHat, ArrowRight, Loader2, CheckCircle2, IndianRupee, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/LanguageContext"
import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/components/error-boundary"

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:          { label: "Order Placed",      color: "text-[#6B8E23]" },
  PREPARING:        { label: "Preparing",          color: "text-foreground" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",   color: "text-[#354024]" },
  DELIVERED:        { label: "Delivered",          color: "text-[#354024]" },
}

const statusSteps = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

export default function OrdersPage() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const { data, error, isLoading } = useSWR("/api/orders", fetcher, {
    revalidateOnFocus: true,
  })

  const orders = Array.isArray(data) ? data : []
  const customerName = session?.user?.name || session?.user?.email || "Customer"

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B8E23]" />
        <p className="text-muted-foreground animate-pulse">{t("Loading your orders...")}</p>
      </div>
    )
  }

  if (error || (!isLoading && orders.length === 0)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 rounded-full bg-muted p-6">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{error ? t("Failed to load orders") : t("No orders yet")}</h1>
        {!error && <p className="mt-2 text-center text-muted-foreground">{t("Start shopping to place your first order!")}</p>}
        <Link href="/marketplace" className="mt-6">
          <Button className="gap-2">{t("Browse Products")} <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight">{t("Your Orders")}</h1>
            <p className="mt-2 text-muted-foreground">{t("Track and manage your orders")}</p>
          </div>
        </div>

        {/* Customer Info Banner */}
        <div className="bg-[#6B8E23]/10 border-b border-[#6B8E23]/30">
          <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6B8E23] text-white">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("Customer")}</p>
                  <p className="font-semibold text-foreground text-lg">{customerName}</p>
                </div>
              </div>
              <div className="h-10 w-px bg-[#6B8E23]/30 hidden sm:block" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("Total Orders")}</p>
                <p className="font-semibold text-foreground text-lg">{orders.length}</p>
              </div>
              <div className="h-10 w-px bg-[#6B8E23]/30 hidden sm:block" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("Total Order Value")}</p>
                <p className="font-semibold text-[#6B8E23] text-lg">
                  ₹{orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="space-y-6">
            {orders.map((order: any) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-4 bg-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-[#6B8E23]" />
                        ORD-{String(order.id).padStart(3, "0")}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("Placed on")} {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                      {/* Customer Name on Order */}
                      <div className="mt-2 flex items-center gap-2 rounded-md bg-[#6B8E23]/10 px-3 py-1.5 w-fit">
                        <User className="h-3.5 w-3.5 text-[#6B8E23]" />
                        <span className="text-xs font-semibold text-[#6B8E23]">{customerName}</span>
                      </div>
                    </div>

                    {/* Amount / Payment box */}
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn("font-medium text-sm", statusConfig[order.status]?.color)}>
                        ● {t(statusConfig[order.status]?.label)}
                      </span>
                      <div className="rounded-xl bg-[#6B8E23] px-4 py-2 text-white text-right shadow-md">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                          {order.status === "DELIVERED" ? t("Paid (COD)") : t("Pay on Delivery")}
                        </p>
                        <p className="text-2xl font-bold flex items-center gap-0.5">
                          <IndianRupee className="h-5 w-5 inline" />
                          {Number(order.total).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-white/80">
                          {order.status === "DELIVERED" ? t("Payment Completed") : t("Cash/UPI upon delivery")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Status bar */}
                  <div className="flex items-center justify-between">
                    {statusSteps.map((step, index) => {
                      const currentIndex = statusSteps.indexOf(order.status)
                      const isCompleted = index <= currentIndex
                      const isCurrent = index === currentIndex
                      return (
                        <div key={step} className="flex flex-1 flex-col items-center">
                          <div className="flex w-full items-center">
                            {index > 0 && (
                              <div className={cn("h-1 flex-1 rounded-full", index <= currentIndex ? "bg-primary" : "bg-muted")} />
                            )}
                            <div className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                              isCurrent && "ring-2 ring-primary ring-offset-2"
                            )}>
                              {index + 1}
                            </div>
                            {index < statusSteps.length - 1 && (
                              <div className={cn("h-1 flex-1 rounded-full", index < currentIndex ? "bg-primary" : "bg-muted")} />
                            )}
                          </div>
                          <span className={cn("mt-2 text-xs text-center", isCurrent ? "font-medium" : "text-muted-foreground")}>
                            {t(statusConfig[step].label)}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Items Grouped by Farmer */}
                  <div>
                    <h4 className="mb-3 font-medium">{t("Order Details")}</h4>
                    <div className="space-y-6">
                      {(() => {
                        const farmerGroups = order.items.reduce((acc: any, item: any) => {
                          const farmerId = item.product?.farmer?.id || "unknown"
                          if (!acc[farmerId]) acc[farmerId] = { farmer: item.product?.farmer, items: [], status: item.status }
                          acc[farmerId].items.push(item)
                          return acc
                        }, {})

                        return Object.values(farmerGroups).map((group: any, idx) => (
                          <div key={idx} className="rounded-lg border border-[#6B8E23] bg-card overflow-hidden">
                            {/* Farmer Header */}
                            <div className="flex items-center justify-between border-b border-[#6B8E23] bg-muted/30 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <ChefHat className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-sm">
                                  {group.farmer?.farmName || "Direct-Roots Farmer"}
                                  {group.farmer?.name && <span className="text-muted-foreground font-normal"> ({group.farmer.name})</span>}
                                </span>
                              </div>
                              <span className={cn("text-xs font-semibold px-2 py-1 rounded-full bg-muted", statusConfig[group.status]?.color)}>
                                {t(statusConfig[group.status]?.label) || group.status}
                              </span>
                            </div>

                            {/* Items */}
                            <div className="divide-y divide-border">
                              {group.items.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-4 p-3">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                    {item.product?.imageUrl ? (
                                      <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="rounded-md object-cover h-full w-full" />
                                    ) : "📦"}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.product?.name}</p>
                                    <p className="text-xs text-muted-foreground">{t("Qty:")} {item.quantity} × ₹{item.price}</p>
                                  </div>
                                  <p className="font-semibold text-sm">₹{item.price * item.quantity}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>

                  {/* Order Total row */}
                  <div className="flex items-center justify-between rounded-xl bg-[#6B8E23]/10 border border-[#6B8E23]/30 px-6 py-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("Customer")}</p>
                      <p className="font-semibold text-foreground">{customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t("Amount Paid")}</p>
                      <p className="text-2xl font-bold text-[#6B8E23]">₹{Number(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}