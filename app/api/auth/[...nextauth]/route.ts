import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const providers = []

// Safely configure Google Provider only if valid non-placeholder credentials exist
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

if (
  googleClientId &&
  googleClientSecret &&
  !googleClientId.includes("PLACEHOLDER") &&
  !googleClientSecret.includes("PLACEHOLDER")
) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  )
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null
      const cleanEmail = credentials.email.trim().toLowerCase()

      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      })
      if (!user || !user.password) return null

      const passwordMatch = await bcrypt.compare(credentials.password, user.password)
      if (!passwordMatch) return null

      // Return only trusted minimal identity
      return { id: String(user.id), name: user.name, email: user.email, role: user.role }
    },
  })
)

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const cleanEmail = profile.email.toLowerCase()
        let dbUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        })

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: profile.name || "Google User",
              email: cleanEmail,
              password: "", // Google accounts do not store local password
              role: "CUSTOMER",
              emailVerified: new Date(), // Google guarantees email verification
              profileImage: (profile as any).picture || null,
            },
          })
        }

        user.id = String(dbUser.id)
        ;(user as any).role = dbUser.role
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      // Initial sign-in: capture trusted DB role
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }

      // On session update or periodic refresh:
      // SECURITY: NEVER trust role from client `session.role`.
      // Always re-verify the role strictly from the authoritative database record.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: parseInt(token.id as string) },
          select: { role: true },
        })
        if (dbUser) {
          token.role = dbUser.role
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
