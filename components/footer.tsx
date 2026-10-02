import Link from "next/link"
import { Leaf, Mail, MapPin, Phone } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-[#6B8E23] bg-[#354024] text-[#E5D7C4]">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5D7C4]">
                <Leaf className="h-5 w-5 text-[#354024]" />
              </div>
              <span className="text-xl font-bold text-[#E5D7C4]">DirectRoots</span>
            </Link>
            <p className="text-sm text-[#E5D7C4]/70">
              Connecting local farmers directly with your table. Fresh, sustainable, and community-driven.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-semibold text-[#E5D7C4]">Quick Links</h3>
            <ul className="space-y-2 text-sm text-[#E5D7C4]/70">
              <li>
                <Link href="/marketplace" className="hover:text-white transition-colors">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link href="/farmer" className="hover:text-white transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-semibold text-[#E5D7C4]">Support</h3>
            <ul className="space-y-2 text-sm text-[#E5D7C4]/70">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Delivery Info
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Return Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 border-t border-[#E5D7C4]/20 pt-8 text-center text-sm text-[#E5D7C4]/70">
          <p>&copy; {new Date().getFullYear()} DirectRoots. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
