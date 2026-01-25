import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"
import { ModuleKey } from "@/lib/module-access"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      entityId: string
      role: string
      entityName?: string
      organizationName?: string
      accountId?: string
      permissions?: string[]
      enabledModules?: ModuleKey[]
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    entityId: string
    role: string
    entityName?: string
    organizationName?: string
    accountId?: string
    enabledModules?: ModuleKey[]
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id?: string
    entityId?: string
    role?: string
    entityName?: string
    organizationName?: string
    accountId?: string
    permissions?: string[]
    enabledModules?: ModuleKey[]
  }
}
