"use client"

import Link from "next/link"
import Image from "next/image"
import { Plus, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCart, type Product } from "@/lib/cart-context"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg flex flex-col h-full">
      <Link href={`/marketplace/${product.id}`} className="relative block aspect-square overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
            No image
          </div>
        )}
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
