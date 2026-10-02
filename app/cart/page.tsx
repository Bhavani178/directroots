"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"
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
  const router = useRouter()
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [confirmedPin, setConfirmedPin] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleCheckoutClick = () => {
    setShowLocationPicker(true)
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
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
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
                              onClick={() =>
                                updateQuantity(item.cartItemId, item.quantity - 1)
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateQuantity(item.cartItemId, item.quantity + 1)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-semibold text-primary">
                            ₹{item.price * item.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{t("Order Summary")}</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("Subtotal")}</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("Delivery")}</span>
                    <span className={total >= 35 ? "text-primary" : ""}>
                      {total >= 500 ? t("Free") : "₹40"}
                    </span>
                  </div>
                  {total < 500 && (
                    <p className="text-xs text-muted-foreground">
                      {t("Add ₹")}{500 - total}{t("more for free delivery")}
                    </p>
                  )}
                  <div className="border-t border-[#6B8E23] pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>{t("Total")}</span>
                      <span className="text-primary">
                        ₹{total + (total >= 500 ? 0 : 40)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-[#6B8E23]/20 p-4 text-sm text-[#6B8E23]">
                  {t("🚚 Eco Delivery Available")}

                  {t("Your order qualifies for grouped local delivery, reducing fuel consumption and pollution.")}
                </div>
                {!showLocationPicker ? (
                  <>
                    {checkoutError && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {checkoutError}
                      </div>
                    )}
                    <Button className="mt-6 w-full gap-2" onClick={handleCheckoutClick}>
                      {t("Proceed to Checkout")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="mt-6 space-y-3 border-t border-[#6B8E23] pt-4">
                    <h3 className="text-sm font-semibold text-foreground">{t("Confirm Delivery Location Pin")}</h3>
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
                  <Button variant="ghost" className="mt-2 w-full">
                    {t("Continue Shopping")}
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