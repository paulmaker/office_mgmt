import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import { getUserPermissions } from "@/lib/platform-core/rbac"
import { getUserEntity } from "@/lib/platform-core/multi-tenancy"

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
          where: { email: credentials.email as string },
          include: {
            entity: {
              include: {
                tenantAccount: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        })

        if (!user || !user.isActive) return null

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
          entityId: user.entityId,
          accountId: user.entity?.tenantAccountId,
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
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.role = (user as any).role
        token.entityId = (user as any).entityId
        token.accountId = (user as any).accountId
        
        // Load permissions and cache in JWT
        if (user.id) {
          const permissions = await getUserPermissions(user.id)
          token.permissions = permissions
        }
      }
      
      // If role changed (via trigger), refresh permissions
      if (trigger === "update" && token.sub) {
        const updatedUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true },
        })
        
        if (updatedUser && updatedUser.role !== token.role) {
          token.role = updatedUser.role
          const permissions = await getUserPermissions(token.sub as string)
          token.permissions = permissions
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        const tokenData = token as {
          role?: string
          sub?: string
          entityId?: string
          accountId?: string
          permissions?: string[]
        }
        
        if (tokenData.sub) {
          (session.user as any).id = tokenData.sub
        }
        if (tokenData.role) {
          (session.user as any).role = tokenData.role
        }
        if (tokenData.entityId) {
          (session.user as any).entityId = tokenData.entityId
        }
        if (tokenData.accountId) {
          (session.user as any).accountId = tokenData.accountId
        }
        if (tokenData.permissions) {
          (session.user as any).permissions = tokenData.permissions
        }
      }
      return session
    },
  },
})

// Export the handlers for the API route
export const { GET, POST } = handlers
