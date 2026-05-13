import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const { pathname } = req.nextUrl

  // Redirect logged-in users away from login/register
  if (token && (pathname === "/login" || pathname === "/register")) {
    if (token.role === "FARMER") return NextResponse.redirect(new URL("/farmer", req.url))
    return NextResponse.redirect(new URL("/marketplace", req.url)) // ← changed
  }

  // Protect farmer routes
  if (pathname.startsWith("/farmer")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url))
    if (token.role !== "FARMER") return NextResponse.redirect(new URL("/marketplace", req.url)) // ← changed
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/farmer/:path*", "/login", "/register"],
}