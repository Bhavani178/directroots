"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, User, MapPin, ShieldCheck, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCart } from "@/lib/cart-context"
import { useLanguage } from "@/lib/LanguageContext"
import { useState } from "react"
import dynamic from "next/dynamic"

const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => <div className="h-[250px] w-full rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">Loading delivery map...</div>,
})

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, total, clearCart } = useCart()
  const { t } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [confirmedPin, setConfirmedPin] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const customerName = session?.user?.name || session?.user?.email || "Customer"
  const deliveryCharge = total >= 500 ? 0 : 40
  const grandTotal = total + deliveryCharge

  const handleConfirmCheckoutLocation = async (lat: number, lng: number, addressText?: string) => {
    setConfirmedPin({ lat, lng, address: addressText })
    setCheckoutError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryLat: lat,
          deliveryLng: lng,
          deliveryAddress: addressText || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        clearCart()
        router.push("/orders")
      } else {
        setCheckoutError(data.error || "Checkout failed. Please check your delivery location and try again.")
      }
    } catch (err: any) {
      setCheckoutError(err.message || "An unexpected error occurred during checkout.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 rounded-full bg-muted p-6">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{t("Your cart is empty")}</h1>
        <p className="mt-2 text-center text-muted-foreground">
          {t("Looks like you haven't added any products yet.")}
        </p>
        <Link href="/marketplace" className="mt-6">
          <Button className="gap-2">
            {t("Browse Products")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("Shopping Cart")}</h1>
          <p className="mt-2 text-muted-foreground">
            {items.length} {items.length === 1 ? t("item") : t("items")} {t("in your cart")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* ── Left: Cart Items ── */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border">
                        <Image
                          src={item.imageUrl || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{item.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {typeof item.farmer === "string"
                                  ? item.farmer
                                  : (item.farmer?.farmName ?? item.farmer?.name ?? item.farmer_name ?? "")}
                              </p>
                              <p className="mt-1 text-sm font-medium text-[#6B8E23]">
                                ₹{item.price} / {item.unit ?? "kg"}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.cartItemId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-bold text-primary text-lg">₹{item.price * item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Right: Order Summary (Amazon-style) ── */}
          <div>
            <Card className="sticky top-24 overflow-hidden border border-[#6B8E23]/40">
              {/* Header */}
              <div className="bg-[#6B8E23] px-5 py-3">
                <h2 className="text-base font-bold text-white tracking-wide">{t("Order Summary")}</h2>
              </div>

              <CardContent className="p-5 space-y-4">

                {/* ── Customer Info ── */}
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    {t("Delivering To")}
                  </div>
                  <p className="font-bold text-foreground text-base">{customerName}</p>
                  {session?.user?.email && session.user.email !== customerName && (
                    <p className="text-xs text-muted-foreground">{session.user.email}</p>
                  )}
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#6B8E23]" />
                    <span>{confirmedPin?.address || t("Pin your delivery location below")}</span>
                  </div>
                </div>

                {/* ── Items in Order ── */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    <Package className="h-3.5 w-3.5" />
                    {t("Items Ordered")} ({items.length})
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative h-8 w-8 shrink-0 rounded overflow-hidden border border-border">
                            <Image
                              src={item.imageUrl || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                          <span className="truncate text-foreground">{item.name}</span>
                          <span className="shrink-0 text-muted-foreground">× {item.quantity}</span>
                        </div>
                        <span className="shrink-0 font-medium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Price Breakdown ── */}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("Subtotal")} ({items.reduce((s, i) => s + i.quantity, 0)} {t("items")})
                    </span>
                    <span className="font-medium">₹{total.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("Delivery Charge")}</span>
                    {deliveryCharge === 0 ? (
                      <span className="font-medium text-[#6B8E23]">{t("FREE")}</span>
                    ) : (
                      <span className="font-medium">₹{deliveryCharge}</span>
                    )}
                  </div>

                  {total < 500 && (
                    <p className="text-xs text-[#6B8E23] bg-[#6B8E23]/10 rounded px-2 py-1">
                      🎉 {t("Add")} ₹{(500 - total).toFixed(2)} {t("more for FREE delivery")}
                    </p>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("Discount")}</span>
                    <span className="font-medium text-[#6B8E23]">₹0.00</span>
                  </div>
                </div>

                {/* ── Grand Total ── */}
                <div className="rounded-lg bg-[#6B8E23] px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/80 font-medium uppercase tracking-wide">{t("Total Amount")}</p>
                    <p className="text-xs text-white/60">{t("Inclusive of all charges")}</p>
                  </div>
                  <p className="text-2xl font-bold text-white">₹{grandTotal.toFixed(2)}</p>
                </div>

                {/* ── Eco Badge ── */}
                <div className="rounded-lg bg-[#6B8E23]/10 border border-[#6B8E23]/30 p-3 text-xs text-[#6B8E23] flex gap-2">
                  <span className="text-base shrink-0">🚚</span>
                  <span>{t("Eco Delivery — grouped local delivery reduces fuel consumption and carbon emissions.")}</span>
                </div>

                {/* ── Safe Checkout Badge ── */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <ShieldCheck className="h-4 w-4 text-[#6B8E23]" />
                  {t("Safe & Secure Checkout")}
                </div>

                {/* ── Checkout / Location Picker ── */}
                {!showLocationPicker ? (
                  <>
                    {checkoutError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {checkoutError}
                      </div>
                    )}
                    <Button className="w-full gap-2 text-base py-5 font-bold" onClick={() => setShowLocationPicker(true)}>
                      {t("Proceed to Checkout")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3 border-t border-[#6B8E23] pt-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#6B8E23]" />
                      {t("Confirm Delivery Location Pin")}
                    </h3>
                    {checkoutError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {checkoutError}
                      </div>
                    )}
                    <LocationPicker
                      onConfirmLocation={handleConfirmCheckoutLocation}
                      confirmButtonText={isSubmitting ? t("Placing Order...") : t("Confirm Pin & Place Order")}
                    />
                    <Button variant="ghost" className="w-full text-xs" onClick={() => setShowLocationPicker(false)}>
                      {t("Cancel Checkout")}
                    </Button>
                  </div>
                )}

                <Link href="/marketplace">
                  <Button variant="ghost" className="w-full text-sm">
                    ← {t("Continue Shopping")}
                  </Button>
                </Link>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
//THIS IS CART->PAGE.TSX