'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'

/**
 * Get all job prices for the current user's accessible entities
 */
export async function getJobPrices(clientId?: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'jobPrices', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view job prices')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Build where clause
  const where: any = {
    entityId: {
      in: entityIds,
    },
  }

  if (clientId) {
    where.clientId = clientId
  }

  // Fetch job prices scoped to accessible entities
  const jobPrices = await prisma.jobPrice.findMany({
    where,
    include: {
      client: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return jobPrices
}

/**
 * Get a single job price by ID
 */
export async function getJobPrice(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'jobPrices', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view job prices')
  }

  // Get the job price
  const jobPrice = await prisma.jobPrice.findUnique({
    where: { id },
    include: {
      client: true,
    },
  })

  if (!jobPrice) {
    throw new Error('Job price not found')
  }

  // Verify user can access this job price's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(jobPrice.entityId)) {
    throw new Error('You do not have permission to access this job price')
  }

  return jobPrice
}

/**
 * Create a new job price
 */
export async function createJobPrice(data: {
  clientId: string
  jobType: string
  description: string
  price: number
  isActive?: boolean
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'jobPrices', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create job prices')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Verify client belongs to user's entity
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  if (client.entityId !== userEntity.entityId) {
    throw new Error('Client does not belong to your entity')
  }

  // Create job price
  const jobPrice = await prisma.jobPrice.create({
    data: {
      entityId: userEntity.entityId,
      clientId: data.clientId,
      jobType: data.jobType,
      description: data.description,
      price: data.price,
      isActive: data.isActive ?? true,
      notes: data.notes,
    },
    include: {
      client: true,
    },
  })

  revalidatePath('/job-prices')
  return jobPrice
}

/**
 * Update an existing job price
 */
export async function updateJobPrice(
  id: string,
  data: {
    clientId?: string
    jobType?: string
    description?: string
    price?: number
    isActive?: boolean
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'jobPrices', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update job prices')
  }

  // Get the existing job price
  const existingJobPrice = await prisma.jobPrice.findUnique({
    where: { id },
  })

  if (!existingJobPrice) {
    throw new Error('Job price not found')
  }

  // Verify user can access this job price's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingJobPrice.entityId)) {
    throw new Error('You do not have permission to update this job price')
  }

  // Update job price
  const jobPrice = await prisma.jobPrice.update({
    where: { id },
    data: {
      clientId: data.clientId,
      jobType: data.jobType,
      description: data.description,
      price: data.price,
      isActive: data.isActive,
      notes: data.notes,
    },
    include: {
      client: true,
    },
  })

  revalidatePath('/job-prices')
  revalidatePath(`/job-prices/${id}`)
  return jobPrice
}

/**
 * Delete a job price
 */
export async function deleteJobPrice(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'jobPrices', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete job prices')
  }

  // Get the existing job price
  const existingJobPrice = await prisma.jobPrice.findUnique({
    where: { id },
  })

  if (!existingJobPrice) {
    throw new Error('Job price not found')
  }

  // Verify user can access this job price's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingJobPrice.entityId)) {
    throw new Error('You do not have permission to delete this job price')
  }

  // Delete job price
  await prisma.jobPrice.delete({
    where: { id },
  })

  revalidatePath('/job-prices')
}
