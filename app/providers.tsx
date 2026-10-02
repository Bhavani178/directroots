"use client"

import { SessionProvider } from "next-auth/react"
import { CartProvider } from "@/lib/cart-context"
import { LanguageProvider } from "@/lib/LanguageContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </CartProvider>
    </SessionProvider>
  )
}