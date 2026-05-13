"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Package, Clock, CheckCircle2, Truck, ChefHat, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:          { label: "Order Placed",      color: "text-amber-600" },
  PREPARING:        { label: "Preparing",          color: "text-orange-600" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",   color: "text-primary" },
  DELIVERED:        { label: "Delivered",          color: "text-green-600" },
}

const statusSteps = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center">Loading...</div>

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 rounded-full bg-muted p-6">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 text-center text-muted-foreground">Start shopping to place your first order!</p>
        <Link href="/marketplace" className="mt-6">
          <Button className="gap-2">Browse Products <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Orders</h1>
          <p className="mt-2 text-muted-foreground">Track and manage your orders</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">ORD-{String(order.id).padStart(3, "0")}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={cn("font-medium", statusConfig[order.status]?.color)}>
                    {statusConfig[order.status]?.label}
                  </span>
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
                          {statusConfig[step].label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Items */}
                <div>
                  <h4 className="mb-3 font-medium">Order Items</h4>
                  <div className="space-y-3">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                          {item.product?.imageUrl ? (
                            <Image src={item.product.imageUrl} alt={item.product.name} width={64} height={64} className="rounded-md object-cover" />
                          ) : "No img"}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity} x ₹{item.price}</p>
                        </div>
                        <p className="font-semibold">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold text-primary">₹{order.total}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}