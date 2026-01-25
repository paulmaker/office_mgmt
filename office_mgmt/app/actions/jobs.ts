'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import type { JobStatus } from '@prisma/client'
import { requireModule } from '@/lib/module-access'

/**
 * Get all jobs for the current user's accessible entities
 */
export async function getJobs() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = (session.user as any).entityId

  // Check module access
  await requireModule(entityId, 'jobs')

  // Check permission
  const canRead = await hasPermission(userId, 'jobs', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view jobs')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch jobs scoped to accessible entities
  const jobs = await prisma.job.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
    include: {
      client: true,
      employees: {
        include: {
          employee: true,
        },
      },
      lineItems: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return jobs
}

/**
 * Get a single job by ID
 */
export async function getJob(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'jobs', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view jobs')
  }

  // Get the job
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: true,
      employees: {
        include: {
          employee: true,
        },
      },
      lineItems: true,
    },
  })

  if (!job) {
    throw new Error('Job not found')
  }

  // Verify user can access this job's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(job.entityId)) {
    throw new Error('You do not have permission to access this job')
  }

  return job
}

/**
 * Create a new job
 */
export async function createJob(data: {
  jobNumber: string
  clientId: string
  jobDescription: string
  dateWorkCommenced: Date
  employeeIds: string[]
  lineItems: Array<{ description: string; amount: number; notes?: string }>
  status?: JobStatus
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'jobs', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create jobs')
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

  // Verify employees belong to user's entity
  if (data.employeeIds.length > 0) {
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: data.employeeIds },
        entityId: userEntity.entityId,
      },
    })

    if (employees.length !== data.employeeIds.length) {
      throw new Error('One or more employees not found or do not belong to your entity')
    }
  }

  // Calculate total from line items
  const total = data.lineItems.reduce((sum, item) => sum + item.amount, 0)

  // Check if job number already exists in entity
  const existingJob = await prisma.job.findFirst({
    where: {
      entityId: userEntity.entityId,
      jobNumber: data.jobNumber,
    },
  })

  if (existingJob) {
    throw new Error('A job with this job number already exists')
  }

  // Create job with employees and line items
  const job = await prisma.job.create({
    data: {
      entityId: userEntity.entityId,
      jobNumber: data.jobNumber,
      clientId: data.clientId,
      jobDescription: data.jobDescription,
      dateWorkCommenced: data.dateWorkCommenced,
      price: total,
      status: data.status || 'PENDING',
      notes: data.notes,
      employees: {
        create: data.employeeIds.map(employeeId => ({
          employeeId,
        })),
      },
      lineItems: {
        create: data.lineItems.map(item => ({
          description: item.description,
          amount: item.amount,
          notes: item.notes,
        })),
      },
    },
    include: {
      client: true,
      employees: {
        include: {
          employee: true,
        },
      },
      lineItems: true,
    },
  })

  revalidatePath('/jobs')
  return job
}

/**
 * Update an existing job
 */
export async function updateJob(
  id: string,
  data: {
    jobNumber?: string
    clientId?: string
    jobDescription?: string
    dateWorkCommenced?: Date
    employeeIds?: string[]
    lineItems?: Array<{ id?: string; description: string; amount: number; notes?: string }>
    status?: JobStatus
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'jobs', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update jobs')
  }

  // Get the existing job
  const existingJob = await prisma.job.findUnique({
    where: { id },
    include: {
      employees: true,
      lineItems: true,
    },
  })

  if (!existingJob) {
    throw new Error('Job not found')
  }

  // Verify user can access this job's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingJob.entityId)) {
    throw new Error('You do not have permission to update this job')
  }

  // Verify client if being changed
  if (data.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    })

    if (!client || client.entityId !== existingJob.entityId) {
      throw new Error('Client not found or does not belong to your entity')
    }
  }

  // Verify employees if being changed
  if (data.employeeIds) {
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: data.employeeIds },
        entityId: existingJob.entityId,
      },
    })

    if (employees.length !== data.employeeIds.length) {
      throw new Error('One or more employees not found or do not belong to your entity')
    }
  }

  // Check job number uniqueness if being changed
  if (data.jobNumber && data.jobNumber !== existingJob.jobNumber) {
    const duplicate = await prisma.job.findFirst({
      where: {
        entityId: existingJob.entityId,
        jobNumber: data.jobNumber,
        id: { not: id },
      },
    })

    if (duplicate) {
      throw new Error('A job with this job number already exists')
    }
  }

  // Calculate total from line items if provided
  let total = existingJob.price
  if (data.lineItems) {
    total = data.lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  // Update job
  const job = await prisma.job.update({
    where: { id },
    data: {
      jobNumber: data.jobNumber,
      clientId: data.clientId,
      jobDescription: data.jobDescription,
      dateWorkCommenced: data.dateWorkCommenced,
      price: total,
      status: data.status,
      notes: data.notes,
      // Update employees
      ...(data.employeeIds !== undefined && {
        employees: {
          deleteMany: {},
          create: data.employeeIds.map(employeeId => ({
            employeeId,
          })),
        },
      }),
      // Update line items
      ...(data.lineItems !== undefined && {
        lineItems: {
          deleteMany: {},
          create: data.lineItems.map(item => ({
            description: item.description,
            amount: item.amount,
            notes: item.notes,
          })),
        },
      }),
    },
    include: {
      client: true,
      employees: {
        include: {
          employee: true,
        },
      },
      lineItems: true,
    },
  })

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
  return job
}

/**
 * Delete a job
 */
export async function deleteJob(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'jobs', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete jobs')
  }

  // Get the existing job
  const existingJob = await prisma.job.findUnique({
    where: { id },
  })

  if (!existingJob) {
    throw new Error('Job not found')
  }

  // Verify user can access this job's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingJob.entityId)) {
    throw new Error('You do not have permission to delete this job')
  }

  // Delete job (cascade will delete employees and line items)
  await prisma.job.delete({
    where: { id },
  })

  revalidatePath('/jobs')
}

/**
 * Get jobs for a specific client (for invoice creation)
 */
export async function getJobsByClient(clientId: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'jobs', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view jobs')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Get the client to verify access
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  if (!entityIds.includes(client.entityId)) {
    throw new Error('You do not have permission to access this client')
  }

  // Fetch jobs for this client that haven't been invoiced
  const jobs = await prisma.job.findMany({
    where: {
      entityId: client.entityId,
      clientId: clientId,
      invoicePaid: false,
      invoiceId: null,
    },
    include: {
      lineItems: true,
    },
    orderBy: {
      dateWorkCommenced: 'desc',
    },
  })

  return jobs
}
