'use server'

import { prisma } from '@/lib/prisma'
import { isPlatformAdmin, isAccountAdmin } from '@/lib/platform-core/rbac'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getUserEntity } from '@/lib/platform-core/multi-tenancy'

/**
 * Create a new Entity
 * - Platform Admins can create in any TenantAccount
 * - Account Admins can create in their own TenantAccount
 */
export async function createEntity(data: {
  tenantAccountId: string
  name: string
  slug: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const isAdmin = await isPlatformAdmin(userId)

  // Check if user has permission
  if (!isAdmin) {
    const isAccAdmin = await isAccountAdmin(userId, data.tenantAccountId)
    if (!isAccAdmin) {
      throw new Error('Only Platform Admins and Account Admins can create Entities')
    }
  }

  // Check if slug already exists within the TenantAccount
  const existing = await prisma.entity.findFirst({
    where: {
      tenantAccountId: data.tenantAccountId,
      slug: data.slug,
    },
  })

  if (existing) {
    throw new Error('An Entity with this slug already exists in this TenantAccount')
  }

  const entity = await prisma.entity.create({
    data: {
      tenantAccountId: data.tenantAccountId,
      name: data.name,
      slug: data.slug,
      isActive: true,
    },
  })

  return entity
}

/**
 * Get Entities
 * - Platform Admins see all
 * - Account Admins see entities in their account
 * - Entity Admins see their own entity
 */
export async function getEntities(tenantAccountId?: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const isAdmin = await isPlatformAdmin(userId)

  if (isAdmin) {
    // Platform Admin: can see all or filter by tenantAccountId
    return prisma.entity.findMany({
      where: tenantAccountId ? { tenantAccountId } : undefined,
      include: {
        tenantAccount: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  // Account Admin: see entities in their account
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  return prisma.entity.findMany({
    where: {
      tenantAccountId: userEntity.accountId,
    },
    include: {
      tenantAccount: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Update Entity
 */
export async function updateEntity(
  id: string,
  data: {
    name?: string
    slug?: string
    isActive?: boolean
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const isAdmin = await isPlatformAdmin(userId)

  if (!isAdmin) {
    // Check if user is Account Admin for this entity's account
    const entity = await prisma.entity.findUnique({
      where: { id },
      select: { tenantAccountId: true },
    })

    if (!entity) {
      throw new Error('Entity not found')
    }

    const isAccAdmin = await isAccountAdmin(userId, entity.tenantAccountId)
    if (!isAccAdmin) {
      throw new Error('Only Platform Admins and Account Admins can update Entities')
    }
  }

  return prisma.entity.update({
    where: { id },
    data,
  })
}
