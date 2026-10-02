"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import {
  Package, IndianRupee, TrendingUp,
  ShoppingBag, Plus, Edit, Trash2, Map, User, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/LanguageContext"
import { ErrorBoundary } from "@/components/error-boundary"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

export default function FarmerDashboardPage() {
  const { t } = useLanguage()

  const { data: productsData, error: productsError, mutate: mutateProducts } = useSWR("/api/farmer/products", fetcher, { revalidateOnFocus: true })
  const { data: ordersData, error: ordersError, mutate: mutateOrders } = useSWR("/api/farmer/orders", fetcher, { revalidateOnFocus: true })

  const isLoading = !productsData || !ordersData
  const hasError = productsError || ordersError

  const products = Array.isArray(productsData) ? productsData : []
  const orders = Array.isArray(ordersData) ? ordersData : []

  const handleDelete = async (id: number) => {
    // Optimistic update
    mutateProducts(products.filter((p: any) => p.id !== id), false)
    await fetch(`/api/products/${id}`, { method: "DELETE" })
    mutateProducts()
  }

  const handleStatusUpdate = async (orderId: number, status: string) => {
    // Optimistic update
    mutateOrders(orders.map((o: any) => o.id === orderId ? { ...o, status } : o), false)
    await fetch("/api/farmer/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    })
    mutateOrders()
  }

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.total, 0)
  const ordersThisWeek = orders.filter((o: any) => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(o.createdAt) > weekAgo
  }).length

  const stats = [
    { title: t("Total Revenue"), value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee },
    { title: t("Products Listed"), value: String(products.length), icon: Package },
    { title: t("Orders This Week"), value: String(ordersThisWeek), icon: ShoppingBag },
    { title: t("Total Orders"), value: String(orders.length), icon: TrendingUp },
  ]

  const statusOptions = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]
  const statusColors: Record<string, string> = {
    PENDING: "text-[#6B8E23]",
    PREPARING: "text-foreground",
    OUT_FOR_DELIVERY: "text-[#354024]",
    DELIVERED: "text-[#354024]",
  }

  if (isLoading && !hasError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B8E23]" />
        <p className="text-muted-foreground animate-pulse">{t("Loading dashboard...")}</p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <p className="text-destructive font-medium">{t("Failed to load dashboard data.")}</p>
        <Button onClick={() => { mutateProducts(); mutateOrders(); }}>{t("Retry")}</Button>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("Farmer Dashboard")}</h1>
                <p className="mt-2 text-muted-foreground">{t("Welcome back")}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/profile">
                  <Button variant="outline" className="gap-2">
                    <User className="h-4 w-4" />
                    {t("Edit Profile")}
                  </Button>
                </Link>
                <Link href="/farmer/delivery-map">
                  <Button variant="outline" className="gap-2">
                    <Map className="h-4 w-4" />
                    {t("Delivery Map")}
                  </Button>
                </Link>
                <Link href="/farmer/products/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("Add Product")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6B8E23]/20">
                      <stat.icon className="h-6 w-6 text-[#6B8E23]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Incoming Orders */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t("Incoming Orders")}</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("No orders yet")}</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <div key={order.id} className="rounded-lg border border-[#6B8E23] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">
                            ORD-{String(order.id).padStart(3, "0")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.user?.name} • {order.items.length} {t("items")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </p>
                          <div className="mt-2 space-y-1">
                            {order.items.map((item: any) => (
                              <p key={item.id} className="text-xs text-muted-foreground">
                                • {item.product?.name} x{item.quantity} — ₹{item.price * item.quantity}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-semibold">₹{order.total}</p>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            className={`rounded-md border border-[#6B8E23] bg-background px-2 py-1 text-sm font-medium ${statusColors[order.status]}`}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {t(s)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("Your Products")}</CardTitle>
                <Link href="/farmer/products/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("Add Product")}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("No products listed yet")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#6B8E23] text-left text-sm text-muted-foreground">
                        <th className="pb-3 pr-4">{t("Product")}</th>
                        <th className="pb-3 pr-4">{t("Category")}</th>
                        <th className="pb-3 pr-4">{t("Price")}</th>
                        <th className="pb-3 pr-4">{t("Stock")}</th>
                        <th className="pb-3">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product: any) => (
                        <tr key={product.id} className="border-b border-[#6B8E23]">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                                <Image
                                  src={product.imageUrl || "/placeholder.svg"}
                                  alt={product.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {product.description}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                              {product.category}
                            </span>
                          </td>
                          <td className="py-4 pr-4 font-medium">₹{product.price}</td>
                          <td className="py-4 pr-4">
                            <span className={`font-medium ${product.stock < 20 ? "text-destructive" : "text-primary"}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <Link href={`/farmer/products/${product.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
}