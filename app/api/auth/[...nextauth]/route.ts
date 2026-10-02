import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_CLIENT_SECRET",
    }),
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
        if (!user) return null
        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) return null

        return { id: String(user.id), name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
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
              emailVerified: new Date(),
              profileImage: (profile as any).picture || null,
            },
          })
        }

        user.id = String(dbUser.id)
        ;(user as any).role = dbUser.role
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      } else if (token.email && (!token.id || !token.role)) {
        // Fetch role from DB if missing
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
          select: { id: true, role: true },
        })
        if (dbUser) {
          token.id = String(dbUser.id)
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