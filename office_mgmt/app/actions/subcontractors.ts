'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import type { CISStatus, PaymentType } from '@prisma/client'

/**
 * Get all subcontractors for the current user's accessible entities
 */
export async function getSubcontractors() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'subcontractors', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view subcontractors')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch subcontractors scoped to accessible entities
  const subcontractors = await prisma.subcontractor.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return subcontractors
}

/**
 * Get a single subcontractor by ID
 */
export async function getSubcontractor(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'subcontractors', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view subcontractors')
  }

  // Get the subcontractor
  const subcontractor = await prisma.subcontractor.findUnique({
    where: { id },
  })

  if (!subcontractor) {
    throw new Error('Subcontractor not found')
  }

  // Verify user can access this subcontractor's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(subcontractor.entityId)) {
    throw new Error('You do not have permission to access this subcontractor')
  }

  return subcontractor
}

/**
 * Create a new subcontractor
 */
export async function createSubcontractor(data: {
  name: string
  email: string
  phone?: string
  address?: string
  niNumber?: string
  utr?: string
  cisVerificationNumber?: string
  cisStatus?: CISStatus
  paymentType?: PaymentType
  bankDetails?: any
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'subcontractors', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create subcontractors')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Check if email already exists in this entity
  const existing = await prisma.subcontractor.findFirst({
    where: {
      entityId: userEntity.entityId,
      email: data.email,
    },
  })

  if (existing) {
    throw new Error('A subcontractor with this email already exists')
  }

  // Create subcontractor scoped to user's entity
  const subcontractor = await prisma.subcontractor.create({
    data: {
      entityId: userEntity.entityId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      niNumber: data.niNumber,
      utr: data.utr,
      cisVerificationNumber: data.cisVerificationNumber,
      cisStatus: data.cisStatus ?? 'NOT_VERIFIED',
      paymentType: data.paymentType ?? 'CIS',
      bankDetails: data.bankDetails,
      notes: data.notes,
    },
  })

  revalidatePath('/payroll')
  return subcontractor
}

/**
 * Update an existing subcontractor
 */
export async function updateSubcontractor(
  id: string,
  data: {
    name?: string
    email?: string
    phone?: string
    address?: string
    niNumber?: string
    utr?: string
    cisVerificationNumber?: string
    cisStatus?: CISStatus
    paymentType?: PaymentType
    bankDetails?: any
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'subcontractors', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update subcontractors')
  }

  // Get the existing subcontractor
  const existingSubcontractor = await prisma.subcontractor.findUnique({
    where: { id },
  })

  if (!existingSubcontractor) {
    throw new Error('Subcontractor not found')
  }

  // Verify user can access this subcontractor's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingSubcontractor.entityId)) {
    throw new Error('You do not have permission to update this subcontractor')
  }

  // If email is being changed, check for duplicates
  if (data.email && data.email !== existingSubcontractor.email) {
    const duplicate = await prisma.subcontractor.findFirst({
      where: {
        entityId: existingSubcontractor.entityId,
        email: data.email,
      },
    })

    if (duplicate) {
      throw new Error('A subcontractor with this email already exists')
    }
  }

  // Update subcontractor
  const subcontractor = await prisma.subcontractor.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      niNumber: data.niNumber,
      utr: data.utr,
      cisVerificationNumber: data.cisVerificationNumber,
      cisStatus: data.cisStatus,
      paymentType: data.paymentType,
      bankDetails: data.bankDetails,
      notes: data.notes,
    },
  })

  revalidatePath('/payroll')
  return subcontractor
}

/**
 * Delete a subcontractor
 */
export async function deleteSubcontractor(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'subcontractors', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete subcontractors')
  }

  // Get the existing subcontractor
  const existingSubcontractor = await prisma.subcontractor.findUnique({
    where: { id },
  })

  if (!existingSubcontractor) {
    throw new Error('Subcontractor not found')
  }

  // Verify user can access this subcontractor's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingSubcontractor.entityId)) {
    throw new Error('You do not have permission to delete this subcontractor')
  }

  // Delete subcontractor
  await prisma.subcontractor.delete({
    where: { id },
  })

  revalidatePath('/payroll')
}
