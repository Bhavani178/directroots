"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Loader2, ChevronDown, Truck, CheckCircle2, Clock, MapPin, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const statusOptions = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]

const statusColors: Record<string, string> = {
  PENDING:          "bg-yellow-100 text-yellow-800 border-yellow-300",
  PREPARING:        "bg-blue-100 text-blue-800 border-blue-300",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800 border-orange-300 animate-pulse",
  DELIVERED:        "bg-green-100 text-green-800 border-green-300",
}

const statusLabels: Record<string, string> = {
  PENDING: "Order Placed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
}

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useSWR("/api/admin/orders", fetcher)
  const [updating, setUpdating] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>("ALL")

  const handleStatusChange = async (id: number, status: string) => {
    setUpdating(id)
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        toast.success(`Order #ORD-${String(id).padStart(3, "0")} marked as ${statusLabels[status]}`)
        mutate("/api/admin/orders")
      } else {
        toast.error("Failed to update status")
      }
    } catch (e) {
      toast.error("Error communicating with server")
    } finally {
      setUpdating(null)
    }
  }

  const allOrders = orders ?? []
  const filteredOrders = filter === "ALL" 
    ? allOrders 
    : allOrders.filter((o: any) => o.status === filter)

  const totalRevenue = allOrders.reduce((s: number, o: any) => s + (o.total ?? 0), 0)
  const outForDeliveryCount = allOrders.filter((o: any) => o.status === "OUT_FOR_DELIVERY").length
  const pendingCount = allOrders.filter((o: any) => o.status === "PENDING" || o.status === "PREPARING").length
  const deliveredCount = allOrders.filter((o: any) => o.status === "DELIVERED").length

  return (
    <div className="p-8 space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery & Orders Control</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor orders, update delivery progress, and track real-time fulfillment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Platform Revenue:</span>
          <span className="text-xl font-bold text-[#6B8E23] bg-[#6B8E23]/10 px-3 py-1 rounded-lg">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilter("ALL")}
          className={`p-4 rounded-xl text-left border transition-all ${
            filter === "ALL" ? "border-[#6B8E23] bg-[#6B8E23]/5 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
            <span>All Orders</span>
            <Package className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{allOrders.length}</p>
        </button>

        <button
          onClick={() => setFilter("PENDING")}
          className={`p-4 rounded-xl text-left border transition-all ${
            filter === "PENDING" ? "border-yellow-500 bg-yellow-50 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between text-yellow-700 text-xs font-semibold uppercase">
            <span>Pending / Prep</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-800">{pendingCount}</p>
        </button>

        <button
          onClick={() => setFilter("OUT_FOR_DELIVERY")}
          className={`p-4 rounded-xl text-left border transition-all ${
            filter === "OUT_FOR_DELIVERY" ? "border-orange-500 bg-orange-50 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between text-orange-700 text-xs font-semibold uppercase">
            <span>Out for Delivery</span>
            <Truck className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-800">{outForDeliveryCount}</p>
        </button>

        <button
          onClick={() => setFilter("DELIVERED")}
          className={`p-4 rounded-xl text-left border transition-all ${
            filter === "DELIVERED" ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between text-green-700 text-xs font-semibold uppercase">
            <span>Delivered</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-green-800">{deliveredCount}</p>
        </button>
      </div>

      {/* Orders Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#6B8E23]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Customer & Address</th>
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Current Status</th>
                    <th className="px-4 py-3 text-left">Quick Delivery Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order: any) => {
                    const isBusy = updating === order.id
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Order ID & Date */}
                        <td className="px-4 py-4 align-top">
                          <p className="font-mono font-bold text-[#6B8E23]">
                            ORD-{String(order.id).padStart(3, "0")}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </td>

                        {/* Customer & Delivery Address */}
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-gray-900">{order.user?.name || "Customer"}</p>
                          <p className="text-xs text-gray-400">{order.user?.email}</p>
                          <div className="flex items-start gap-1 text-xs text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{order.deliveryAddress || order.user?.address || "Address on File"}</span>
                          </div>
                        </td>

                        {/* Items */}
                        <td className="px-4 py-4 align-top">
                          <div className="max-w-[200px] space-y-0.5">
                            {order.items?.slice(0, 2).map((item: any) => (
                              <p key={item.id} className="truncate text-xs text-gray-700">
                                • {item.product?.name} <span className="text-gray-400">×{item.quantity}</span>
                              </p>
                            ))}
                            {order.items?.length > 2 && (
                              <p className="text-xs text-gray-400 font-medium">+{order.items.length - 2} more</p>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-4 align-top text-right font-bold text-gray-900">
                          ₹{Number(order.total).toFixed(2)}
                        </td>

                        {/* Status Dropdown */}
                        <td className="px-4 py-4 align-top">
                          <div className="relative inline-block">
                            <select
                              value={order.status}
                              disabled={isBusy}
                              onChange={e => handleStatusChange(order.id, e.target.value)}
                              className={`appearance-none rounded-full border px-3 py-1.5 text-xs font-semibold pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6B8E23]/40 ${statusColors[order.status]}`}
                            >
                              {statusOptions.map(s => (
                                <option key={s} value={s}>{statusLabels[s]}</option>
                              ))}
                            </select>
                            {isBusy ? (
                              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-600" />
                            ) : (
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
                            )}
                          </div>
                        </td>

                        {/* 1-Click Action Buttons */}
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {order.status !== "OUT_FOR_DELIVERY" && order.status !== "DELIVERED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleStatusChange(order.id, "OUT_FOR_DELIVERY")}
                                className="h-7 text-xs gap-1 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                              >
                                <Truck className="h-3 w-3" />
                                Out for Delivery
                              </Button>
                            )}

                            {order.status !== "DELIVERED" && (
                              <Button
                                size="sm"
                                disabled={isBusy}
                                onClick={() => handleStatusChange(order.id, "DELIVERED")}
                                className="h-7 text-xs gap-1 bg-[#6B8E23] hover:bg-[#55721c] text-white"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Mark Delivered
                              </Button>
                            )}

                            {order.status === "DELIVERED" && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3 text-green-600" /> Complete
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                        No orders match the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
