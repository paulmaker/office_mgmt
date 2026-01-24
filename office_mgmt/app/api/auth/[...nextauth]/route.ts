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
        if (!credentials?.email) {
          return null
        }

        // TODO: Re-enable password check when password field is added to User model
        // For now, password check is disabled for development
        // if (!credentials?.password) {
        //   return null
        // }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              entity: {
                include: {
                  tenantAccount: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          })

          if (!user || !user.isActive || !user.entity) {
            return null
          }

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
            entityName: user.entity.name,
            organizationName: user.entity?.tenantAccount?.name,
            accountId: user.entity?.tenantAccountId,
          }
        } catch (error) {
          console.error('[AUTH] Error during authorization:', error)
          // Return null instead of throwing to prevent server errors
          // This will show "Invalid email or password" to the user
          return null
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
        try {
          token.role = (user as any).role
          token.entityId = (user as any).entityId
          token.entityName = (user as any).entityName
          token.organizationName = (user as any).organizationName
          token.accountId = (user as any).accountId
          
          // Load permissions and cache in JWT
          if (user.id) {
            const permissions = await getUserPermissions(user.id)
            token.permissions = permissions
          }
        } catch (error) {
          console.error('[AUTH] JWT callback error:', error)
          // Don't fail the login if permissions fail to load
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
          entityName?: string
          organizationName?: string
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
        if (tokenData.entityName) {
          (session.user as any).entityName = tokenData.entityName
        }
        if (tokenData.organizationName) {
          (session.user as any).organizationName = tokenData.organizationName
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
