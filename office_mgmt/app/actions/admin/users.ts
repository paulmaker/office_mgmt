'use server'

import { prisma } from '@/lib/prisma'
import { isPlatformAdmin, isAccountAdmin, isEntityAdmin } from '@/lib/platform-core/rbac'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getUserEntity } from '@/lib/platform-core/multi-tenancy'
import type { Role } from '@/lib/platform-core/rbac/types'
import { randomBytes } from 'crypto'
import { addHours } from 'date-fns'
import { resend, EMAIL_FROM } from '@/lib/email'

/**
 * Create a new User
 */
export async function createUser(data: {
  email: string
  name?: string
  entityId: string
  role: Role
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Validate required fields
  if (!data.email || !data.email.trim()) {
    throw new Error('Email is required')
  }

  if (!data.entityId || !data.entityId.trim()) {
    throw new Error('Please select a company')
  }

  if (!data.role) {
    throw new Error('Role is required')
  }

  const userId = session.user.id as string
  const isAdmin = await isPlatformAdmin(userId)

  // Check if user has permission to create users in this entity
  if (!isAdmin) {
    const entity = await prisma.entity.findUnique({
      where: { id: data.entityId },
      select: { tenantAccountId: true },
    })

    if (!entity) {
      throw new Error('Company not found. Please select a valid company.')
    }

    // Account Admin can create users in their account
    const isAccAdmin = await isAccountAdmin(userId, entity.tenantAccountId)
    
    // Entity Admin can create users in their entity
    const isEntAdmin = await isEntityAdmin(userId, data.entityId)

    if (!isAccAdmin && !isEntAdmin) {
      throw new Error('You do not have permission to create users in this Company')
    }
  } else {
    // Platform admin also needs to verify the entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: data.entityId },
      select: { id: true },
    })

    if (!entity) {
      throw new Error('Company not found. Please select a valid company.')
    }
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email.trim().toLowerCase() },
  })

  if (existing) {
    throw new Error('A user with this email already exists')
  }

  // Generate invite token
  const token = randomBytes(32).toString('hex')
  const expiry = addHours(new Date(), 48) // 48 hours for invite

  const user = await prisma.user.create({
    data: {
      email: data.email.trim().toLowerCase(),
      name: data.name?.trim() || null,
      entityId: data.entityId,
      role: data.role,
      isActive: true,
      resetToken: token,
      resetTokenExpiry: expiry,
    },
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

  // Send Invite Email
  let emailSent = false
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/auth/reset-password?token=${token}`

    const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Welcome to ${user.entity.name}`,
        html: `
          <p>Hello ${user.name || 'there'},</p>
          <p>You have been invited to join <strong>${user.entity.name}</strong> on the Office Manager platform.</p>
          <p>Click the link below to set your password and access your account:</p>
          <a href="${inviteUrl}">${inviteUrl}</a>
          <p>This link will expire in 48 hours.</p>
        `
    })

    if (error) {
      console.error("Resend API Error:", error)
    } else {
      emailSent = true
    }
  } catch (error) {
    console.error("Failed to send invite email:", error)
    // We don't throw here to avoid rolling back user creation if email fails
  }

  // Return a serializable response
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    entityId: user.entityId,
    entityName: user.entity.name,
    organizationName: user.entity.tenantAccount.name,
    isActive: user.isActive,
    emailSent,
  }
}

/**
 * Get Users
 * - Platform Admins see all
 * - Account Admins see users in their account
 * - Entity Admins see users in their entity
 */
export async function getUsers(entityId?: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const isAdmin = await isPlatformAdmin(userId)

  if (isAdmin) {
    // Platform Admin: see all or filter by entityId
    return prisma.user.findMany({
      where: entityId ? { entityId } : undefined,
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
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  // Get user's entity context
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  const isAccAdmin = await isAccountAdmin(userId, userEntity.accountId)

  if (isAccAdmin) {
    // Account Admin: see all users in their account
    return prisma.user.findMany({
      where: {
        entity: {
          tenantAccount: {
            id: userEntity.accountId,
          },
        },
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  // Entity Admin: see users in their entity
  return prisma.user.findMany({
    where: {
      entityId: userEntity.entityId,
    },
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
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Update User
 */
export async function updateUser(
  id: string,
  data: {
    name?: string
    email?: string
    role?: Role
    entityId?: string
    isActive?: boolean
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const isAdmin = await isPlatformAdmin(userId)

  // Get target user's entity
  const targetUser = await prisma.user.findUnique({
    where: { id },
    include: {
      entity: {
        select: {
          tenantAccountId: true,
        },
      },
    },
  })

  if (!targetUser) {
    throw new Error('User not found')
  }

  // Check permissions
  if (!isAdmin) {
    const isAccAdmin = await isAccountAdmin(userId, targetUser.entity.tenantAccountId)
    const isEntAdmin = await isEntityAdmin(userId, targetUser.entityId)

    if (!isAccAdmin && !isEntAdmin) {
      throw new Error('You do not have permission to update this user')
    }
  }

  return prisma.user.update({
    where: { id },
    data,
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
}
