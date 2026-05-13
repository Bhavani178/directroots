"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface Product {
  id: string
  name: string
  price: number
  unit: string
  image: string
  farmer: string
  farmerId: string
  category: string
  description: string
  stock: number
}

export interface CartItem extends Product {
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (product: Product) => Promise<void>  // ← add Promise<void>
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
}
const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = async (product: Product) => {
  // Save to DB
  await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: parseInt(product.id),
      quantity: 1,
    }),
  })

  // Update local state for UI
  setItems((prev) => {
    const existing = prev.find((item) => item.id === product.id)
    if (existing) {
      return prev.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      )
    }
    return [...prev, { ...product, quantity: 1 }]
  })
}

  const removeFromCart = async (productId: string) => {
  // Find cart item id from DB
  const res = await fetch("/api/cart")
  const cartItems = await res.json()
  const dbItem = cartItems.find((i: any) => i.productId === parseInt(productId))
  
  if (dbItem) {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dbItem.id }),
    })
  }

  setItems((prev) => prev.filter((item) => item.id !== productId))
}

  const updateQuantity = async (productId: string, quantity: number) => {
  if (quantity <= 0) {
    removeFromCart(productId)
    return
  }
  setItems((prev) =>
    prev.map((item) => (item.id === productId ? { ...item, quantity } : item))
  )
}

  const clearCart = () => setItems([])

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
