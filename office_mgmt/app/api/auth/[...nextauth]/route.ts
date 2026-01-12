import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user) return null

        // TODO: Implement password hashing check when password field is added to User model
        // For now, this is a placeholder that allows any user to sign in
        // In production, you'll need to:
        // 1. Add password field to User model
        // 2. Hash passwords on user creation
        // 3. Compare hashed passwords here
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        const tokenWithRole = token as { role?: string; sub?: string }
        (session.user as any).role = tokenWithRole.role
        (session.user as any).id = token.sub
      }
      return session
    },
  },
})

// Export the handlers for the API route
export const { GET, POST } = handlers
