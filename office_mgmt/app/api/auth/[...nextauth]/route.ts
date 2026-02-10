import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import { getUserPermissions } from "@/lib/platform-core/rbac"
import { getUserEntity, getAccessibleEntityIds } from "@/lib/platform-core/multi-tenancy"
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
        if (!credentials?.email || !credentials?.password) return null

        const email = (credentials.email as string).trim().toLowerCase()
        const password = (credentials.password as string).trim()

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            entity: {
              include: {
                tenantAccount: { select: { name: true } },
              },
            },
          },
        })

        if (!user || !user.isActive || !user.entity || !user.password) return null

        const isValid = await compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          entityId: user.entityId,
          entityName: user.entity.name,
          organizationName: user.entity.tenantAccount?.name ?? undefined,
          accountId: user.entity.tenantAccountId ?? undefined,
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
    async signIn() {
      return true
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        try {
          token.role = (user as any).role
          token.entityId = (user as any).entityId
          token.entityName = (user as any).entityName
          token.organizationName = (user as any).organizationName
          token.accountId = (user as any).accountId
          try {
            const enabledModulesSet = await getEnabledModules((user as any).entityId)
            token.enabledModules = Array.from(enabledModulesSet)
          } catch {
            token.enabledModules = getAllModuleKeys()
          }
          if (user.id) {
            const permissions = await getUserPermissions(user.id)
            token.permissions = permissions
          }
        } catch (error) {
          console.error('[AUTH] JWT callback error:', error)
        }
      }
      
      // Session update: user chose a different entity (entity switcher)
      if (trigger === "update" && session?.entityId && token.sub) {
        try {
          const entityIds = await getAccessibleEntityIds(token.sub as string)
          if (entityIds.includes(session.entityId)) {
            const entity = await prisma.entity.findUnique({
              where: { id: session.entityId },
              include: {
                tenantAccount: { select: { name: true } }
              }
            })
            if (entity) {
              token.entityId = entity.id
              token.entityName = entity.name
              token.organizationName = entity.tenantAccount?.name ?? undefined
              token.accountId = entity.tenantAccountId ?? undefined
              try {
                const enabledModulesSet = await getEnabledModules(entity.id)
                token.enabledModules = Array.from(enabledModulesSet)
              } catch (err) {
                console.error('[AUTH] Error refreshing enabled modules:', err)
              }
            }
          }
        } catch (err) {
          console.error('[AUTH] Error updating session entity:', err)
        }
      }

      // If role changed (via trigger), refresh permissions and modules
      if (trigger === "update" && token.sub && !session?.entityId) {
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
