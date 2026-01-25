import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import { getUserPermissions } from "@/lib/platform-core/rbac"
import { getUserEntity } from "@/lib/platform-core/multi-tenancy"
import { compare } from "bcryptjs"
import { getEnabledModules, getAllModuleKeys, type ModuleKey } from "@/lib/module-access"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
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

          // If user has a password set, verify it
          if (user.password) {
            const isValid = await compare(credentials.password as string, user.password)
            if (!isValid) {
              return null
            }
          } else {
            // User has no password set (legacy or invited)
            // For security, we should NOT allow login without password
            // They must use the "Forgot Password" / Invite flow to set one
            // However, for migration, if we want to allow the "empty" password trick for dev:
            // if (credentials.password === "dev-bypass") return user // Example
            
            // Strict mode:
            return null
          }
          
          // Load enabled modules from entity settings
          let enabledModules: ModuleKey[] = []
          try {
            const enabledModulesSet = await getEnabledModules(user.entityId)
            enabledModules = Array.from(enabledModulesSet)
          } catch (error) {
            console.error('[AUTH] Error loading enabled modules:', error)
            // Fallback to all modules if there's an error
            enabledModules = getAllModuleKeys()
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            entityId: user.entityId,
            entityName: user.entity.name,
            organizationName: user.entity?.tenantAccount?.name,
            accountId: user.entity?.tenantAccountId,
            enabledModules,
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
          token.enabledModules = (user as any).enabledModules || getAllModuleKeys()
          
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
      
      // If role changed (via trigger), refresh permissions and modules
      if (trigger === "update" && token.sub) {
        const updatedUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          include: {
            entity: {
              select: { id: true, settings: true }
            }
          }
        })
        
        if (updatedUser) {
          if (updatedUser.role !== token.role) {
            token.role = updatedUser.role
            const permissions = await getUserPermissions(token.sub as string)
            token.permissions = permissions
          }
          
          // Refresh enabled modules
          try {
            const enabledModulesSet = await getEnabledModules(updatedUser.entityId)
            token.enabledModules = Array.from(enabledModulesSet)
          } catch (error) {
            console.error('[AUTH] Error refreshing enabled modules:', error)
          }
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
          enabledModules?: ModuleKey[]
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
        if (tokenData.enabledModules) {
          (session.user as any).enabledModules = tokenData.enabledModules
        } else {
          // Fallback to all modules if not set
          (session.user as any).enabledModules = getAllModuleKeys()
        }
      }
      return session
    },
  },
})

// Export the handlers for the API route
export const { GET, POST } = handlers
