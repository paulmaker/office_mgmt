/**
 * Platform Core: Multi-Tenancy Utilities
 * 
 * Generic utilities for managing multi-tenant data scoping and access.
 * This module is designed to be reusable across different projects.
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Get user's entity context
 */
export async function getUserEntity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      entityId: true,
      entity: {
        select: {
          id: true,
          tenantAccountId: true,
          tenantAccount: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  })

  if (!user || !user.entity) {
    return null
  }

  return {
    userId: user.id,
    entityId: user.entityId,
    accountId: user.entity.tenantAccountId,
  }
}

/**
 * Check if user can access a specific entity
 */
export async function canAccessEntity(
  userId: string,
  entityId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      entityId: true,
      entity: {
        select: {
          tenantAccountId: true,
        },
      },
    },
  })

  if (!user) return false

  // Platform Admin can access all entities
  if (user.role === 'PLATFORM_ADMIN') {
    return true
  }

  // Account Admin can access entities within their account
  if (user.role === 'ACCOUNT_ADMIN') {
    const targetEntity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { tenantAccountId: true },
    })

    return targetEntity?.tenantAccountId === user.entity?.tenantAccountId
  }

  // Entity Admin and Entity User can only access their own entity
  return user.entityId === entityId
}

/**
 * Get all entity IDs that a user can access
 */
export async function getAccessibleEntityIds(
  userId: string
): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      entityId: true,
      entity: {
        select: {
          tenantAccountId: true,
        },
      },
    },
  })

  if (!user) return []

  // Platform Admin can access all entities
  if (user.role === 'PLATFORM_ADMIN') {
    const allEntities = await prisma.entity.findMany({
      select: { id: true },
    })
    return allEntities.map((e) => e.id)
  }

  // Account Admin can access all entities in their account
  if (user.role === 'ACCOUNT_ADMIN' && user.entity?.tenantAccountId) {
    const accountEntities = await prisma.entity.findMany({
      where: { tenantAccountId: user.entity.tenantAccountId },
      select: { id: true },
    })
    return accountEntities.map((e) => e.id)
  }

  // Entity Admin and Entity User can only access their own entity
  return user.entityId ? [user.entityId] : []
}

/**
 * Add entity filter to a Prisma where clause
 */
export function scopeToEntity<T extends Prisma.JsonObject>(
  where: T,
  entityId: string
): T {
  return {
    ...where,
    entityId,
  }
}

/**
 * Add entity filter to a Prisma where clause with multiple entity support
 */
export function scopeToEntities<T extends Prisma.JsonObject>(
  where: T,
  entityIds: string[]
): T {
  if (entityIds.length === 0) {
    return where
  }

  if (entityIds.length === 1) {
    return scopeToEntity(where, entityIds[0])
  }

  return {
    ...where,
    entityId: {
      in: entityIds,
    },
  } as T
}
