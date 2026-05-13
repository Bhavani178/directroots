"use client"

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
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute right-2 top-2">
          <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            {product.category}
          </span>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-card-foreground line-clamp-1">{product.name}</h3>
          <span className="shrink-0 font-bold text-primary">
            ₹{product.price}
            <span className="text-xs font-normal text-muted-foreground">/{product.unit}</span>
          </span>
        </div>
        <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{product.farmer}</span>
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
