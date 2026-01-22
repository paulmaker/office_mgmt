/**
 * Platform Core: RBAC Permission Checks
 * 
 * Functions to check user permissions.
 */

import { prisma } from '@/lib/prisma'
import type { Role, PermissionCheck } from './types'
import { ENTITY_USER_PERMISSIONS } from './constants'

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string,
  module?: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  })

  if (!user) return false

  const role = user.role as Role

  // Platform Admin has all permissions
  if (role === 'PLATFORM_ADMIN') {
    return true
  }

  // Account Admin has all permissions within their account
  if (role === 'ACCOUNT_ADMIN') {
    return true
  }

  // Entity Admin has all permissions within their entity
  if (role === 'ENTITY_ADMIN') {
    return true
  }

  // Entity User: Check specific permissions
  if (role === 'ENTITY_USER') {
    // Check if permission exists in ENTITY_USER_PERMISSIONS
    if (module) {
      // Module permission check
      return ENTITY_USER_PERMISSIONS.some(
        (p) => !p.resource && !p.action && p.module === module
      )
    } else {
      // Resource permission check
      return ENTITY_USER_PERMISSIONS.some(
        (p) => p.resource === resource && p.action === action
      )
    }
  }

  return false
}

/**
 * Check if user has module access
 */
export async function hasModuleAccess(
  userId: string,
  module: string
): Promise<boolean> {
  return hasPermission(userId, '', '', module)
}

/**
 * Get user's effective permissions
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  })

  if (!user) return []

  const role = user.role as Role

  // Platform Admin, Account Admin, and Entity Admin have all permissions
  if (
    role === 'PLATFORM_ADMIN' ||
    role === 'ACCOUNT_ADMIN' ||
    role === 'ENTITY_ADMIN'
  ) {
    return ['*:*'] // All permissions
  }

  // Entity User: Return specific permissions
  if (role === 'ENTITY_USER') {
    return ENTITY_USER_PERMISSIONS.map((p) => {
      if (p.module) {
        return `module:${p.module}`
      }
      return `${p.resource}:${p.action}`
    })
  }

  return []
}

/**
 * Check if user is Platform Admin
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  return user?.role === 'PLATFORM_ADMIN'
}

/**
 * Check if user is Account Admin
 */
export async function isAccountAdmin(
  userId: string,
  accountId?: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      entity: {
        select: {
          tenantAccountId: true,
        },
      },
    },
  })

  if (user?.role !== 'ACCOUNT_ADMIN') {
    return false
  }

  // If accountId provided, verify it matches
  if (accountId) {
    return user.entity?.tenantAccountId === accountId
  }

  return true
}

/**
 * Check if user is Entity Admin
 */
export async function isEntityAdmin(
  userId: string,
  entityId?: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      entityId: true,
    },
  })

  if (user?.role !== 'ENTITY_ADMIN') {
    return false
  }

  // If entityId provided, verify it matches
  if (entityId) {
    return user.entityId === entityId
  }

  return true
}
