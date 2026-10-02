"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart, Menu, X, Leaf, User, LogOut } from "lucide-react"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { useLanguage } from "@/lib/LanguageContext"
import { cn } from "@/lib/utils"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()
  const { items } = useCart()
  const { data: session } = useSession()
  const { language, setLanguage, t } = useLanguage()

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const navigation = [
    { name: t("Home"), href: "/" },
    { name: t("Marketplace"), href: "/marketplace" },
    { name: t("Orders"), href: "/orders" },
    ...(session?.user?.role === "FARMER"
      ? [{ name: t("Farmer Dashboard"), href: "/farmer" }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#6B8E23] bg-[#354024] text-[#E5D7C4] shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5D7C4]">
              <Leaf className="h-5 w-5 text-[#354024]" />
            </div>
            <span className="text-xl font-bold text-[#E5D7C4]">DirectRoots</span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex md:items-center md:gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-[#E5D7C4]",
                pathname === item.href ? "text-[#E5D7C4]" : "text-[#E5D7C4]/70"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          
          {/* Language Toggle for All Users */}
          <div className="hidden md:flex items-center text-xs font-medium border border-[#6B8E23] rounded-md overflow-hidden">
            <button
              onClick={() => setLanguage("en")}
              className={cn(
                "px-2 py-1 transition-colors",
                language === "en" ? "bg-[#E5D7C4] text-[#354024]" : "text-[#E5D7C4] hover:bg-white/10"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("kn")}
              className={cn(
                "px-2 py-1 transition-colors",
                language === "kn" ? "bg-[#E5D7C4] text-[#354024]" : "text-[#E5D7C4] hover:bg-white/10"
              )}
            >
              ಕನ್ನಡ
            </button>
          </div>

          <Link href="/cart" className="relative text-[#E5D7C4]">
            <Button variant="ghost" size="icon" className="relative hover:bg-white/10 hover:text-[#E5D7C4]">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Auth section */}
          {session ? (
            <div className="relative hidden md:block">
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-white/10 hover:text-[#E5D7C4]"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5D7C4]">
                  <User className="h-4 w-4 text-[#354024]" />
                </div>
                <div className="text-left text-[#E5D7C4]">
                  <p className="text-sm font-medium leading-none">{session.user.name}</p>
                  <p className="text-xs text-[#E5D7C4]/70 capitalize">
                    {session.user.role?.toLowerCase()}
                  </p>
                </div>
              </Button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#6B8E23] bg-background text-foreground shadow-lg">
                  <div className="p-2">
                    {session.user.role === "FARMER" && (
                      <Link
                        href="/farmer"
                        className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => setDropdownOpen(false)}
                      >
                        {t("Farmer Dashboard")}
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setDropdownOpen(false)}
                    >
                      {t("My Orders")}
                    </Link>
                    <Link
                      href="/profile"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setDropdownOpen(false)}
                    >
                      {t("My Profile")}
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("Sign out")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden md:block text-[#E5D7C4]">
              <Button variant="ghost" className="gap-2 hover:bg-white/10 hover:text-[#E5D7C4]">
                <User className="h-4 w-4" />
                {t("Sign in")}
              </Button>
            </Link>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-[#E5D7C4] hover:bg-white/10 hover:text-[#E5D7C4]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#6B8E23] md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-base font-medium transition-colors",
                  pathname === item.href
                    ? "bg-white/20 text-[#E5D7C4]"
                    : "text-[#E5D7C4]/70 hover:bg-white/10 hover:text-[#E5D7C4]"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {/* Mobile auth */}
            {session ? (
              <>
                <div className="px-3 py-2 text-sm font-medium text-[#E5D7C4]">
                  {session.user.name}
                  <span className="ml-2 text-xs text-[#E5D7C4]/70 capitalize">
                    ({session.user.role?.toLowerCase()})
                  </span>
                </div>
                <Link
                  href="/profile"
                  className="block rounded-lg px-3 py-2 text-base font-medium text-[#E5D7C4]/70 hover:bg-white/10 hover:text-[#E5D7C4]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("My Profile")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-destructive hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t("Sign out")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block rounded-lg px-3 py-2 text-base font-medium text-[#E5D7C4]/70 hover:bg-white/10 hover:text-[#E5D7C4]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("Sign in")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}