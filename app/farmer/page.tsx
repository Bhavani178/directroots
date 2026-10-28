"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { useSession } from "next-auth/react"
import {
  Package, IndianRupee, TrendingUp,
  ShoppingBag, Plus, Edit, Trash2, Map, User, Loader2,
  Store, CheckCircle2, ArrowRight, Sparkles, Sprout
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from "@/lib/LanguageContext"
import { ErrorBoundary } from "@/components/error-boundary"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

export default function FarmerDashboardPage() {
  const { t } = useLanguage()
  const { data: session, status, update: updateSession } = useSession()

  // Onboarding form state for CUSTOMER role
  const [farmName, setFarmName] = useState("")
  const [sellerType, setSellerType] = useState<"FARMER" | "ARTISAN">("FARMER")
  const [address, setAddress] = useState("")
  const [bio, setBio] = useState("")
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState("")

  const isSeller = Boolean(
    session?.user?.role &&
    (session.user.role === "FARMER" || session.user.role === "ARTISAN" || session.user.role === "ADMIN")
  )

  // Only query seller endpoints when the user is an authorized seller
  const { data: productsData, error: productsError, mutate: mutateProducts } = useSWR(
    isSeller ? "/api/farmer/products" : null,
    fetcher,
    { revalidateOnFocus: true }
  )
  const { data: ordersData, error: ordersError, mutate: mutateOrders } = useSWR(
    isSeller ? "/api/farmer/orders" : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  const isLoading = isSeller && (!productsData || !ordersData)
  const hasError = isSeller && (productsError || ordersError)

  const products = Array.isArray(productsData) ? productsData : []
  const orders = Array.isArray(ordersData) ? ordersData : []

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return

    // Optimistically remove from UI immediately
    const updated = products.filter((p: any) => p.id !== id)
    mutateProducts(updated, false)

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to delete product")
        mutateProducts() // restore on failure
        return
      }
      toast.success(`"${name}" deleted successfully`)
      // Keep the optimistic removal — do NOT re-fetch (archived stock=0 products would reappear)
    } catch {
      toast.error("Network error. Could not delete product.")
      mutateProducts() // restore on network failure
    }
  }

  const handleStatusUpdate = async (orderId: number, status: string) => {
    // Optimistic update
    const previousOrders = ordersData
    if (ordersData) {
      mutateOrders(ordersData.map((o: any) => o.id === orderId ? { ...o, status } : o), false)
    }
    try {
      const res = await fetch("/api/farmer/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to update order status")
        mutateOrders(previousOrders, false)
      } else {
        toast.success(`Order #${orderId} marked as ${status.replace(/_/g, " ")}`)
      }
    } catch (err) {
      toast.error("Network error updating order status")
      mutateOrders(previousOrders, false)
    } finally {
      mutateOrders()
    }
  }

  const handleBecomeSeller = async (e: React.FormEvent) => {
    e.preventDefault()
    setActivating(true)
    setActivationError("")

    try {
      const res = await fetch("/api/farmer/become-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmName: farmName.trim() || `${session?.user?.name || "My"}'s ${sellerType === "ARTISAN" ? "Crafts Studio" : "Farm"}`,
          sellerType,
          address: address.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate seller account")
      }

      // Update client-side session with new role
      await updateSession({ role: data.role })
      // Re-trigger SWR
      mutateProducts()
      mutateOrders()
    } catch (err: any) {
      setActivationError(err.message || "Something went wrong. Please try again.")
    } finally {
      setActivating(false)
    }
  }

  // 1. Session is still loading
  if (status === "loading") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B8E23]" />
        <p className="text-muted-foreground animate-pulse">{t("Checking authorization...")}</p>
      </div>
    )
  }

  // 2. Unauthenticated visitor -> Show "Become a Seller" landing card with Sign In / Register
  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-xl border border-[#6B8E23] shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6B8E23]/20">
              <Sprout className="h-8 w-8 text-[#6B8E23]" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
              {t("Become a Seller on DirectRoots")}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t("Join local farmers and village artisans selling directly to buyers in your district. Zero middlemen, fair prices, and direct hyperlocal deliveries.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3">
                <CheckCircle2 className="h-5 w-5 text-[#6B8E23] shrink-0 mt-0.5" />
                <span>{t("Direct farm-to-door sales with fair margins")}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3">
                <CheckCircle2 className="h-5 w-5 text-[#6B8E23] shrink-0 mt-0.5" />
                <span>{t("Smart grouped delivery to save logistics costs")}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3">
                <CheckCircle2 className="h-5 w-5 text-[#6B8E23] shrink-0 mt-0.5" />
                <span>{t("Real-time order management dashboard")}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3">
                <CheckCircle2 className="h-5 w-5 text-[#6B8E23] shrink-0 mt-0.5" />
                <span>{t("Multilingual voice & order tracking")}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Link href="/register?role=FARMER" className="flex-1">
                <Button size="lg" className="w-full gap-2">
                  {t("Register as Seller")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login?callbackUrl=/farmer" className="flex-1">
                <Button size="lg" variant="outline" className="w-full">
                  {t("Sign In to Existing Account")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 3. Logged-in as CUSTOMER -> Show 1-Click Seller Onboarding Form!
  if (!isSeller) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-xl border border-[#6B8E23] shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6B8E23]/20">
              <Store className="h-8 w-8 text-[#6B8E23]" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {t("Activate Your Seller Account")}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t("Welcome,")} <strong>{session.user.name}</strong>! {t("Upgrade your account to start listing farm produce or handmade crafts directly on DirectRoots.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBecomeSeller} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="farmName">{t("Farm or Business Name")}</Label>
                <Input
                  id="farmName"
                  placeholder={sellerType === "ARTISAN" ? "e.g. Bidar Craft Studio" : "e.g. Green Valley Organic Farm"}
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t("What do you want to sell?")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSellerType("FARMER")}
                    className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${
                      sellerType === "FARMER"
                        ? "border-[#6B8E23] bg-[#6B8E23]/10 font-medium text-foreground ring-2 ring-[#6B8E23]"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Sprout className="h-6 w-6 text-[#6B8E23] mb-2" />
                    <span className="font-semibold">{t("Farmer / Producer")}</span>
                    <span className="text-xs text-muted-foreground mt-1">{t("Produce, Dairy, Grains, Honey")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerType("ARTISAN")}
                    className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${
                      sellerType === "ARTISAN"
                        ? "border-[#6B8E23] bg-[#6B8E23]/10 font-medium text-foreground ring-2 ring-[#6B8E23]"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Sparkles className="h-6 w-6 text-[#6B8E23] mb-2" />
                    <span className="font-semibold">{t("Artisan / Weaver")}</span>
                    <span className="text-xs text-muted-foreground mt-1">{t("Handlooms, Crafts, Pottery")}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("Pickup Address / Location")}</Label>
                <Input
                  id="address"
                  placeholder="e.g. Near Old Fort, Bidar, Karnataka"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{t("Short Farm / Workshop Bio (Optional)")}</Label>
                <Input
                  id="bio"
                  placeholder="e.g. 10-acre family farm practicing chemical-free farming."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              {activationError && (
                <p className="text-sm font-medium text-destructive">{activationError}</p>
              )}

              <Button type="submit" size="lg" className="w-full gap-2" disabled={activating}>
                {activating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Activating Account...")}
                  </>
                ) : (
                  <>
                    <Store className="h-4 w-4" />
                    {t("Start Selling on DirectRoots")}
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link href="/marketplace" className="text-sm text-muted-foreground hover:underline">
                  {t("No thanks, take me back to Marketplace")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 4. Loading Seller Dashboard
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
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B8E23]" />
        <p className="text-muted-foreground animate-pulse">{t("Loading dashboard...")}</p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
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
                <p className="mt-2 text-muted-foreground">
                  {t("Welcome back,")} <span className="font-semibold text-foreground">{session.user.name}</span> ({session.user.role})
                </p>
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-[#6B8E23]/10 p-4">
                    <Package className="h-8 w-8 text-[#6B8E23]" />
                  </div>
                  <h3 className="text-lg font-semibold">{t("No products listed yet")}</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {t("Start by adding your first product to display it in the hyperlocal marketplace.")}
                  </p>
                  <Link href="/farmer/products/new" className="mt-4">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t("Add Your First Product")}
                    </Button>
                  </Link>
                </div>
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
                                onClick={() => handleDelete(product.id, product.name)}
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
