'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import type { CISStatus, PaymentType } from '@prisma/client'
import { requireModule } from '@/lib/module-access'

/**
 * Get all subcontractors for the current user's accessible entities
 */
export async function getSubcontractors() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = (session.user as any).entityId

  // Check module access
  await requireModule(entityId, 'subcontractors')

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
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canCreate = await hasPermission(userId, 'subcontractors', 'create')
    if (!canCreate) return { success: false, error: 'You do not have permission to create subcontractors' }

    const userEntity = await getUserEntity(userId)
    if (!userEntity) return { success: false, error: 'User entity not found' }

    const existing = await prisma.subcontractor.findFirst({
      where: { entityId: userEntity.entityId, email: data.email },
    })
    if (existing) return { success: false, error: 'A subcontractor with this email already exists' }

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
    return { success: true, data: subcontractor }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
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
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canUpdate = await hasPermission(userId, 'subcontractors', 'update')
    if (!canUpdate) return { success: false, error: 'You do not have permission to update subcontractors' }

    const existingSubcontractor = await prisma.subcontractor.findUnique({ where: { id } })
    if (!existingSubcontractor) return { success: false, error: 'Subcontractor not found' }

    const entityIds = await getAccessibleEntityIds(userId)
    if (!entityIds.includes(existingSubcontractor.entityId))
      return { success: false, error: 'You do not have permission to update this subcontractor' }

    if (data.email && data.email !== existingSubcontractor.email) {
      const duplicate = await prisma.subcontractor.findFirst({
        where: { entityId: existingSubcontractor.entityId, email: data.email },
      })
      if (duplicate) return { success: false, error: 'A subcontractor with this email already exists' }
    }

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
    return { success: true, data: subcontractor }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
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
