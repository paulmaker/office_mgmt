'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { requireSessionEntityId } from '@/lib/session-entity'
import { revalidatePath } from 'next/cache'

/**
 * Get all suppliers for the current user's accessible entities
 */
export async function getSuppliers() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'suppliers', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view suppliers')
  }

  const entityId = requireSessionEntityId(session)

  const suppliers = await prisma.supplier.findMany({
    where: { entityId },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return suppliers
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'suppliers', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view suppliers')
  }

  // Get the supplier
  const supplier = await prisma.supplier.findUnique({
    where: { id },
  })

  if (!supplier) {
    throw new Error('Supplier not found')
  }

  const entityId = requireSessionEntityId(session)
  if (supplier.entityId !== entityId) {
    throw new Error('You do not have permission to access this supplier')
  }

  return supplier
}

/**
 * Create a new supplier
 */
export async function createSupplier(data: {
  name: string
  companyName?: string
  email?: string
  phone?: string
  address?: string
  accountNumber?: string
  vatNumber?: string
  vatRegistered?: boolean
  paymentTerms?: number
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canCreate = await hasPermission(userId, 'suppliers', 'create')
    if (!canCreate) return { success: false, error: 'You do not have permission to create suppliers' }

    const entityId = requireSessionEntityId(session)

    const supplier = await prisma.supplier.create({
      data: {
        entityId,
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        accountNumber: data.accountNumber,
        vatNumber: data.vatNumber,
        vatRegistered: data.vatRegistered ?? false,
        paymentTerms: data.paymentTerms ?? 30,
        notes: data.notes,
      },
    })

    revalidatePath('/suppliers')
    return { success: true, data: supplier }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
}

/**
 * Update an existing supplier
 */
export async function updateSupplier(
  id: string,
  data: {
    name?: string
    companyName?: string
    email?: string
    phone?: string
    address?: string
    accountNumber?: string
    vatNumber?: string
    vatRegistered?: boolean
    paymentTerms?: number
    notes?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canUpdate = await hasPermission(userId, 'suppliers', 'update')
    if (!canUpdate) return { success: false, error: 'You do not have permission to update suppliers' }

    const existingSupplier = await prisma.supplier.findUnique({ where: { id } })
    if (!existingSupplier) return { success: false, error: 'Supplier not found' }

    const entityId = requireSessionEntityId(session)
    if (existingSupplier.entityId !== entityId)
      return { success: false, error: 'You do not have permission to update this supplier' }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        accountNumber: data.accountNumber,
        vatNumber: data.vatNumber,
        vatRegistered: data.vatRegistered,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
      },
    })

    revalidatePath('/suppliers')
    revalidatePath(`/suppliers/${id}`)
    return { success: true, data: supplier }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'suppliers', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete suppliers')
  }

  // Get the existing supplier
  const existingSupplier = await prisma.supplier.findUnique({
    where: { id },
  })

  if (!existingSupplier) {
    throw new Error('Supplier not found')
  }

  // Verify user can access this supplier's entity
  const entityId = requireSessionEntityId(session)
  if (existingSupplier.entityId !== entityId) {
    throw new Error('You do not have permission to delete this supplier')
  }

  // Delete supplier
  await prisma.supplier.delete({
    where: { id },
  })

  revalidatePath('/suppliers')
}
