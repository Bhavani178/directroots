"use client"

import useSWR from "swr"
import { ShoppingBag, Users, Package, Leaf, TrendingUp, IndianRupee, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const statusColors: Record<string, string> = {
  PENDING:          "bg-yellow-100 text-yellow-800",
  PREPARING:        "bg-blue-100 text-blue-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
  DELIVERED:        "bg-green-100 text-green-800",
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useSWR("/api/admin/stats", fetcher)

  const stats = [
    { label: "Total Revenue",  value: `₹${Number(data?.totalRevenue ?? 0).toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-[#6B8E23]",     change: "All time" },
    { label: "Total Orders",   value: data?.totalOrders   ?? "—", icon: ShoppingBag, color: "bg-blue-600",    change: "Placed orders" },
    { label: "Customers",      value: data?.totalUsers    ?? "—", icon: Users,       color: "bg-purple-600",  change: "Registered" },
    { label: "Products",       value: data?.totalProducts ?? "—", icon: Package,     color: "bg-amber-600",   change: "Listed" },
    { label: "Farmers/Artisans",value: data?.totalFarmers ?? "—", icon: Leaf,        color: "bg-emerald-600", change: "Active sellers" },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, Admin. Here's what's happening on DirectRoots.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {isLoading ? <span className="animate-pulse text-gray-300">—</span> : stat.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{stat.change}</p>
                </div>
                <div className={`rounded-lg p-2 ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            </div>
            <TrendingUp className="h-4 w-4 text-[#6B8E23]" />
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {(data?.recentOrders ?? []).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6B8E23]/10 text-xs font-bold text-[#6B8E23]">
                      #{order.id}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.user?.name}</p>
                      <p className="text-xs text-gray-500">{order.user?.email} · {order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-bold text-gray-900">₹{Number(order.total).toFixed(2)}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {order.status?.replace("_", " ")}
                    </span>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              ))}
              {(data?.recentOrders ?? []).length === 0 && (
                <p className="px-6 py-8 text-center text-sm text-gray-400">No orders yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
