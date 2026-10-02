"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Farmer {
  id: number
  name: string
  farmName: string | null
  profileImage: string | null
}

export interface Product {
  id: string
  name: string
  price: number
  unit: string
  image?: string | null   // alias passed by marketplace: image: product.imageUrl
  imageUrl?: string | null
  farmer: string | Farmer | null  // string for legacy data.ts, Farmer object from DB
  // Legacy field — kept for backward compat with any existing UI references
  farmer_name?: string
  category: string
  description: string | null
  stock: number
  distanceKm?: number | null
}

export interface CartItem extends Product {
  cartItemId: number  // the DB CartItem.id (needed for DELETE)
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  isLoading: boolean
  addToCart: (product: Product) => Promise<void>
  removeFromCart: (cartItemId: number) => Promise<void>
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>
  clearCart: () => void
  total: number
  itemCount: number
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // ── Hydrate cart from DB whenever the user's session changes ────────────
  const hydrateCart = useCallback(async () => {
    if (!session?.user) {
      setItems([])
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/cart")
      if (!res.ok) { setItems([]); return }
      const dbItems = await res.json()

      // Map DB CartItem shape → CartItem context shape
      const mapped: CartItem[] = dbItems.map((dbItem: any) => ({
        cartItemId:  dbItem.id,
        id:          String(dbItem.product.id),
        name:        dbItem.product.name,
        price:       dbItem.product.price,
        unit:        dbItem.product.unit ?? "kg",
        imageUrl:    dbItem.product.imageUrl ?? null,
        farmer:      dbItem.product.farmer ?? null,
        farmer_name: dbItem.product.farmer?.farmName ?? dbItem.product.farmer?.name ?? "",
        category:    dbItem.product.category,
        description: dbItem.product.description ?? null,
        stock:       dbItem.product.stock,
        quantity:    dbItem.quantity,
      }))
      setItems(mapped)
    } catch (err) {
      console.error("[CartProvider] hydrate failed:", err)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user])

  useEffect(() => {
    hydrateCart()
  }, [hydrateCart])

  // ── Add to cart ──────────────────────────────────────────────────────────
  const addToCart = async (product: Product) => {
    // Optimistic update
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, cartItemId: -1, quantity: 1 }]
    })

    try {
      const parsedId = parseInt(String(product.id))
      if (isNaN(parsedId)) {
        alert(`Failed to add: Invalid product ID (${product.id})`)
        throw new Error(`Invalid product ID: ${product.id}`)
      }
      
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: parsedId, quantity: 1 }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to add item to cart")
      }
      // Re-hydrate to get real cartItemId from DB
      await hydrateCart()
      toast.success(`${product.name} added to cart`)
    } catch (err: any) {
      console.error("[addToCart]", err)
      toast.error(err.message)
      // Revert optimistic update on failure
      await hydrateCart()
    }
  }

  // ── Remove from cart ─────────────────────────────────────────────────────
  const removeFromCart = async (cartItemId: number) => {
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId))
    try {
      await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cartItemId }),
      })
    } catch (err) {
      console.error("[removeFromCart]", err)
      await hydrateCart()
    }
  }

  // ── Update quantity ──────────────────────────────────────────────────────
  // Calls PATCH /api/cart to persist the new quantity to the DB.
  // State is only updated AFTER the DB confirms — no optimistic update.
  const updateQuantity = async (cartItemId: number, quantity: number) => {
    // quantity <= 0 → delegate to removeFromCart (which calls DELETE)
    if (quantity <= 0) { await removeFromCart(cartItemId); return }

    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cartItemId, quantity }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || "Failed to update quantity")
        return
      }
      const data = await res.json()
      if (data.deleted) {
        // Server treated quantity <= 0 as delete
        setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId))
      } else {
        // Update state with the quantity confirmed by the DB
        setItems((prev) =>
          prev.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity: data.quantity } : item
          )
        )
      }
    } catch (err) {
      console.error("[updateQuantity]", err)
      // Re-hydrate to restore UI to true DB state
      await hydrateCart()
    }
  }

  const clearCart = () => setItems([])

  const total    = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within a CartProvider")
  return context
}
