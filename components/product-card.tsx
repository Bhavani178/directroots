"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCart, type Product } from "@/lib/cart-context"

const categoryFallbacks: Record<string, string> = {
  "Handlooms": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80",
  "Handicrafts": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80",
  "Handmade Crafts": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80",
  "Village Products": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
  "Oils & Honey": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80",
  "Pickles & Processed": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80",
  "Vegetables": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
  "Fruits": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80",
  "Dairy": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80",
  "Grains & Pulses": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  "Spices & Herbs": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600&q=80",
}

const defaultFallback = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const [imgError, setImgError] = useState(false)

  const fallback = categoryFallbacks[product.category] || defaultFallback
  const currentImg = imgError || !product.image ? fallback : product.image

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg flex flex-col h-full">
      <Link href={`/marketplace/${product.id}`} className="relative block aspect-square overflow-hidden bg-muted">
        <Image
          src={currentImg}
          alt={product.name}
          fill
          unoptimized
          onError={() => setImgError(true)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute right-2 top-2">
          <span className="rounded-full bg-[#6B8E23] px-2 py-1 text-xs font-medium text-[#E5D7C4]">
            {product.category}
          </span>
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-card-foreground line-clamp-1">{product.name}</h3>
          <span className="shrink-0 font-bold text-primary">
            ₹{product.price}
            <span className="text-xs font-normal text-muted-foreground">/{product.unit}</span>
          </span>
        </div>
        <div className="mb-3 flex items-center justify-between gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>
              {typeof product.farmer === "string"
                ? product.farmer
                : (product.farmer?.farmName ?? product.farmer?.name ?? product.farmer_name ?? "Local Farm")}
            </span>
          </div>
          {product.distanceKm != null && (
            <span className="font-medium text-primary">
              {product.distanceKm} km away
            </span>
          )}
        </div>
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <Button
          onClick={() => addToCart(product)}
          className="w-full gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  )
}
