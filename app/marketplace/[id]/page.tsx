"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, MapPin, ShoppingBag, Leaf, Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { useLanguage } from "@/lib/LanguageContext"

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage()
  const unwrappedParams = use(params)
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addToCart } = useCart()

  useEffect(() => {
    fetch(`/api/products/${unwrappedParams.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => setProduct(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [unwrappedParams.id])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">{t("Product not found")}</h2>
        <Link href="/marketplace">
          <Button variant="outline">{t("Back to Marketplace")}</Button>
        </Link>
      </div>
    )
  }

  const handleAddToCart = () => {
    addToCart({
      ...product,
      id: String(product.id),
      image: product.imageUrl,
    })
  }

  const farmerName = product.farmer?.farmName || product.farmer?.name || "Unknown Producer"

  return (
    <div className="min-h-screen pb-12">
      <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Link
            href="/marketplace"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Back to Marketplace")}
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="rounded-full bg-[#6B8E23] px-2 py-1 text-xs font-medium text-[#E5D7C4]">
              {product.category}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{product.name}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Section */}
          <div className="relative aspect-square overflow-hidden rounded-xl border border-[#6B8E23] bg-muted/30">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                {t("No image available")}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-3xl font-bold text-primary">
                ₹{product.price}
                <span className="text-lg font-normal text-muted-foreground">
                  /{product.unit}
                </span>
              </p>
              {product.stock > 0 ? (
                <p className="mt-2 text-sm font-medium text-[#6B8E23]">
                  {t("In Stock")} ({product.stock} {product.unit} {t("available")})
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {t("Out of Stock")}
                </p>
              )}
            </div>

            <Button
              size="lg"
              className="gap-2 w-full md:w-auto self-start"
              disabled={product.stock < 1}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="h-5 w-5" />
              {t("Add to Cart")}
            </Button>

            <div className="rounded-lg border border-[#6B8E23] bg-card p-6">
              <h3 className="mb-4 font-semibold text-lg">{t("Product Details")}</h3>
              <p className="whitespace-pre-line text-muted-foreground mb-6">
                {product.description || t("No description provided.")}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {product.isOrganic && (
                  <div className="flex items-center gap-2 text-sm font-medium text-[#6B8E23]">
                    <Leaf className="h-4 w-4" />
                    Certified Organic
                  </div>
                )}
                {product.isHandmade && (
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">✨</span>
                    {t("Handmade Craft")}
                  </div>
                )}
                {product.craftType && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t("Craft Type:")}</span> {product.craftType}
                  </div>
                )}
                {product.harvestDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium text-foreground">{t("Harvested:")}</span>{" "}
                    {new Date(product.harvestDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[#6B8E23] bg-card p-6">
              <h3 className="mb-4 font-semibold text-lg">{t("Producer Information")}</h3>
              <div className="flex items-start gap-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[#6B8E23]">
                  {product.farmer?.profileImage ? (
                    <Image
                      src={product.farmer.profileImage}
                      alt={farmerName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-lg font-bold text-muted-foreground">
                      {farmerName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{farmerName}</p>
                  <p className="text-sm text-muted-foreground">{product.farmer?.name}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {product.farmer?.address || t("Location not specified")}
                  </div>
                </div>
              </div>
              {product.farmer?.bio && (
                <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
                  {product.farmer.bio}
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
