'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
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

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch suppliers scoped to accessible entities
  const suppliers = await prisma.supplier.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
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

  // Verify user can access this supplier's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(supplier.entityId)) {
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
  vatNumber?: string
  vatRegistered?: boolean
  paymentTerms?: number
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'suppliers', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create suppliers')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Create supplier scoped to user's entity
  const supplier = await prisma.supplier.create({
    data: {
      entityId: userEntity.entityId,
      name: data.name,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      vatNumber: data.vatNumber,
      vatRegistered: data.vatRegistered ?? false,
      paymentTerms: data.paymentTerms ?? 30,
      notes: data.notes,
    },
  })

  revalidatePath('/suppliers')
  return supplier
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
    vatNumber?: string
    vatRegistered?: boolean
    paymentTerms?: number
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'suppliers', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update suppliers')
  }

  // Get the existing supplier
  const existingSupplier = await prisma.supplier.findUnique({
    where: { id },
  })

  if (!existingSupplier) {
    throw new Error('Supplier not found')
  }

  // Verify user can access this supplier's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingSupplier.entityId)) {
    throw new Error('You do not have permission to update this supplier')
  }

  // Update supplier
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: data.name,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      vatNumber: data.vatNumber,
      vatRegistered: data.vatRegistered,
      paymentTerms: data.paymentTerms,
      notes: data.notes,
    },
  })

  revalidatePath('/suppliers')
  revalidatePath(`/suppliers/${id}`)
  return supplier
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
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingSupplier.entityId)) {
    throw new Error('You do not have permission to delete this supplier')
  }

  // Delete supplier
  await prisma.supplier.delete({
    where: { id },
  })

  revalidatePath('/suppliers')
}
