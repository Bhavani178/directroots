"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "@/components/product-card"
import { categories } from "@/lib/data"
import { useLanguage } from "@/lib/LanguageContext"
import { cn } from "@/lib/utils"

export default function MarketplacePage() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showFilters, setShowFilters] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [needsLocation, setNeedsLocation] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    // Read optional search query from URL
    const q = new URLSearchParams(window.location.search).get("q")
    if (q) setSearchQuery(q)

    async function loadProducts() {
      setIsLoading(true)
      setFetchError(null)
      try {
        // 1. Immediately fetch products (backend checks session location automatically)
        const res = await fetch("/api/products?limit=300")
        if (!res.ok) {
          throw new Error("Failed to load products")
        }
        let data = await res.json()

        // 2. If browser geolocation is available, try to refine sort
        if ("geolocation" in navigator && (!data || data.length === 0)) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 })
            })
            
            const geoRes = await fetch(`/api/products?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&sort=nearest&limit=300`)
            if (geoRes.ok) {
              data = await geoRes.json()
            }
          } catch (e) {
            console.warn("Geolocation failed, denied, or timed out")
          }
        }

        setProducts(Array.isArray(data) ? data : (data.products || []))
      } catch (err: any) {
        console.error("Failed to load products:", err)
        setFetchError("Unable to load products. Please check your connection and try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [])

  const filteredProducts = products.filter((product: any) => {
    const farmerLabel = (product.farmer?.farmName ?? product.farmer?.name ?? "").toLowerCase()
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farmerLabel.includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
    const cat = (product.category || "").toLowerCase()
    const sel = selectedCategory.toLowerCase()

    let matchesCategory = false
    if (selectedCategory === "All") {
      matchesCategory = true
    } else if (selectedCategory === "Organic") {
      matchesCategory = Boolean(product.isOrganic)
    } else if (selectedCategory === "Dairy") {
      matchesCategory = cat.includes("dairy") || product.name.toLowerCase().includes("milk") || product.name.toLowerCase().includes("paneer") || product.name.toLowerCase().includes("ghee") || product.name.toLowerCase().includes("curd") || product.name.toLowerCase().includes("butter")
    } else if (selectedCategory === "Grains & Pulses") {
      matchesCategory = cat.includes("grain") || cat.includes("pulse") || cat.includes("cereal")
    } else if (selectedCategory === "Spices & Herbs") {
      matchesCategory = cat.includes("spice") || cat.includes("herb")
    } else if (selectedCategory === "Handlooms") {
      matchesCategory =
        cat.includes("handloom") ||
        product.craftType === "Textile" ||
        product.name.toLowerCase().includes("saree") ||
        product.name.toLowerCase().includes("kurta") ||
        product.name.toLowerCase().includes("dhoti") ||
        product.name.toLowerCase().includes("dupatta")
    } else if (selectedCategory === "Handicrafts") {
      // Strictly handicrafts — exclude food, pickles, fruits and vegetables
      matchesCategory =
        (cat.includes("handicraft") || cat.includes("handmade craft")) &&
        !cat.includes("fruit") &&
        !cat.includes("vegetable") &&
        !cat.includes("pickle") &&
        !cat.includes("village")
    } else if (selectedCategory === "Village Products") {
      matchesCategory = cat.includes("village") || cat.includes("oil") || cat.includes("honey") || cat.includes("pickle") || cat.includes("jaggery")
    } else if (selectedCategory === "Fruits") {
      matchesCategory = cat.includes("fruit")
    } else if (selectedCategory === "Vegetables") {
      matchesCategory = cat.includes("vegetable")
    } else {
      matchesCategory = cat === sel
    }
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#6B8E23] bg-secondary/30 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("Marketplace")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("Fresh, local produce from farmers near you")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Search and Filter Bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("Search products or farms...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            className="gap-2 sm:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("Filters")}
          </Button>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="mb-4 font-semibold">{t("Categories")}</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        selectedCategory === category
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="space-y-4 rounded-lg border border-[#6B8E23] bg-card p-4 lg:hidden">
              <h3 className="font-semibold">{t("Categories")}</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category)
                      setShowFilters(false)
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm transition-colors",
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("Showing")} {filteredProducts.length} {t("products")}
              </p>
              {/* Category pills - Desktop */}
              <div className="hidden gap-2 md:flex lg:hidden">
                {categories.slice(0, 5).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition-colors",
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">{t("Finding fresh produce and local crafts near you...")}</p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-destructive/20 bg-destructive/5 p-8">
                <p className="text-sm text-destructive font-medium">{fetchError}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  {t("Try Again")}
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{t("No products found")}</h3>
                <p className="mt-2 text-muted-foreground">
                  {t("Try adjusting your search or filter criteria")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory("All")
                  }}
                >
                  {t("Clear Filters")}
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                   key={product.id}
                   product={{
                     ...product,
                     id: String(product.id),
                     image: product.imageUrl || "",
                     farmer: product.farmer?.farmName ?? product.farmer?.name ?? "Local Farm",
                     unit: product.unit ?? "kg",
                 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
//this is marketplace-page.tsx