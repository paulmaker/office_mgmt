'use server'

import { prisma } from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/platform-core/rbac'
import { auth } from '@/app/api/auth/[...nextauth]/route'

/**
 * Create a new TenantAccount (Platform Admin only)
 */
export async function createTenantAccount(data: {
  name: string
  slug: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Check if user is Platform Admin
  const isAdmin = await isPlatformAdmin(session.user.id as string)
  if (!isAdmin) {
    throw new Error('Only Platform Admins can create TenantAccounts')
  }

  // Check if slug already exists
  const existing = await prisma.tenantAccount.findUnique({
    where: { slug: data.slug },
  })

  if (existing) {
    throw new Error('A TenantAccount with this slug already exists')
  }

  const tenantAccount = await prisma.tenantAccount.create({
    data: {
      name: data.name,
      slug: data.slug,
      isActive: true,
      createdBy: session.user.id as string,
    },
  })

  return tenantAccount
}

/**
 * Get all TenantAccounts (Platform Admin only)
 */
export async function getTenantAccounts() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const isAdmin = await isPlatformAdmin(session.user.id as string)
  if (!isAdmin) {
    throw new Error('Only Platform Admins can view all TenantAccounts')
  }

  return prisma.tenantAccount.findMany({
    include: {
      entities: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          entities: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Update TenantAccount (Platform Admin only)
 */
export async function updateTenantAccount(
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

  const isAdmin = await isPlatformAdmin(session.user.id as string)
  if (!isAdmin) {
    throw new Error('Only Platform Admins can update TenantAccounts')
  }

  return prisma.tenantAccount.update({
    where: { id },
    data,
  })
}
