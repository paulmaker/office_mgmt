'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import type { AssetType } from '@prisma/client'

/**
 * Get all assets for the current user's accessible entities
 */
export async function getAssets() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'assets', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view assets')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch assets scoped to accessible entities
  const assets = await prisma.companyAsset.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return assets
}

/**
 * Get a single asset by ID
 */
export async function getAsset(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'assets', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view assets')
  }

  // Get the asset
  const asset = await prisma.companyAsset.findUnique({
    where: { id },
  })

  if (!asset) {
    throw new Error('Asset not found')
  }

  // Verify user can access this asset's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(asset.entityId)) {
    throw new Error('You do not have permission to access this asset')
  }

  return asset
}

/**
 * Create a new asset
 */
export async function createAsset(data: {
  type: AssetType
  name: string
  registrationNumber?: string
  motDueDate?: Date
  taxDueDate?: Date
  insuranceDueDate?: Date
  serviceDueDate?: Date
  leaseExpiryDate?: Date
  merseyFlow?: boolean
  companyCar?: boolean
  remindersEnabled?: boolean
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'assets', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create assets')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Create asset scoped to user's entity
  const asset = await prisma.companyAsset.create({
    data: {
      entityId: userEntity.entityId,
      type: data.type,
      name: data.name,
      registrationNumber: data.registrationNumber,
      motDueDate: data.motDueDate,
      taxDueDate: data.taxDueDate,
      insuranceDueDate: data.insuranceDueDate,
      serviceDueDate: data.serviceDueDate,
      leaseExpiryDate: data.leaseExpiryDate,
      merseyFlow: data.merseyFlow ?? true,
      companyCar: data.companyCar ?? true,
      remindersEnabled: data.remindersEnabled ?? true,
      notes: data.notes,
    },
  })

  revalidatePath('/assets')
  return asset
}

/**
 * Update an existing asset
 */
export async function updateAsset(
  id: string,
  data: {
    type?: AssetType
    name?: string
    registrationNumber?: string
    motDueDate?: Date | null
    taxDueDate?: Date | null
    insuranceDueDate?: Date | null
    serviceDueDate?: Date | null
    leaseExpiryDate?: Date | null
    merseyFlow?: boolean
    companyCar?: boolean
    remindersEnabled?: boolean
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'assets', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update assets')
  }

  // Get the existing asset
  const existingAsset = await prisma.companyAsset.findUnique({
    where: { id },
  })

  if (!existingAsset) {
    throw new Error('Asset not found')
  }

  // Verify user can access this asset's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingAsset.entityId)) {
    throw new Error('You do not have permission to update this asset')
  }

  // Update asset
  const asset = await prisma.companyAsset.update({
    where: { id },
    data: {
      type: data.type,
      name: data.name,
      registrationNumber: data.registrationNumber,
      motDueDate: data.motDueDate,
      taxDueDate: data.taxDueDate,
      insuranceDueDate: data.insuranceDueDate,
      serviceDueDate: data.serviceDueDate,
      leaseExpiryDate: data.leaseExpiryDate,
      merseyFlow: data.merseyFlow,
      companyCar: data.companyCar,
      remindersEnabled: data.remindersEnabled,
      notes: data.notes,
    },
  })

  revalidatePath('/assets')
  revalidatePath(`/assets/${id}`)
  return asset
}

/**
 * Delete an asset
 */
export async function deleteAsset(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'assets', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete assets')
  }

  // Get the existing asset
  const existingAsset = await prisma.companyAsset.findUnique({
    where: { id },
  })

  if (!existingAsset) {
    throw new Error('Asset not found')
  }

  // Verify user can access this asset's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingAsset.entityId)) {
    throw new Error('You do not have permission to delete this asset')
  }

  // Delete asset
  await prisma.companyAsset.delete({
    where: { id },
  })

  revalidatePath('/assets')
}
