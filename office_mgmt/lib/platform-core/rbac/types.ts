/**
 * Platform Core: RBAC Types
 * 
 * TypeScript types for the RBAC system.
 */

export type Role = 'PLATFORM_ADMIN' | 'ACCOUNT_ADMIN' | 'ENTITY_ADMIN' | 'ENTITY_USER'

export type Permission = {
  id: string
  resource: string
  action: string
  module?: string | null
  description?: string | null
}

export type UserPermission = {
  resource: string
  action: string
  module?: string | null
}

export type PermissionCheck = {
  resource: string
  action: string
  module?: string
}
