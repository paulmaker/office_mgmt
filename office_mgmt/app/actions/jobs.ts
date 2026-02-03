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
      subcontractors: {
        include: {
          subcontractor: true,
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
      subcontractors: {
        include: {
          subcontractor: true,
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
  subcontractorIds?: string[]
  lineItems: Array<{ description: string; amount: number; notes?: string }>
  status?: JobStatus
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canCreate = await hasPermission(userId, 'jobs', 'create')
    if (!canCreate) return { success: false, error: 'You do not have permission to create jobs' }

    const userEntity = await getUserEntity(userId)
    if (!userEntity) return { success: false, error: 'User entity not found' }

    const client = await prisma.client.findUnique({ where: { id: data.clientId } })
    if (!client) return { success: false, error: 'Client not found' }
    if (client.entityId !== userEntity.entityId) return { success: false, error: 'Client does not belong to your entity' }

    if (data.employeeIds.length > 0) {
      const employees = await prisma.employee.findMany({
        where: { id: { in: data.employeeIds }, entityId: userEntity.entityId },
      })
      if (employees.length !== data.employeeIds.length)
        return { success: false, error: 'One or more employees not found or do not belong to your entity' }
    }

    const subcontractorIds = data.subcontractorIds || []
    if (subcontractorIds.length > 0) {
      const subcontractors = await prisma.subcontractor.findMany({
        where: { id: { in: subcontractorIds }, entityId: userEntity.entityId },
      })
      if (subcontractors.length !== subcontractorIds.length)
        return { success: false, error: 'One or more subcontractors not found or do not belong to your entity' }
    }

    const total = data.lineItems.reduce((sum, item) => sum + item.amount, 0)

    const existingJob = await prisma.job.findFirst({
      where: { entityId: userEntity.entityId, jobNumber: data.jobNumber },
    })
    if (existingJob) return { success: false, error: 'A job with this job number already exists' }

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
      subcontractors: {
        create: subcontractorIds.map(subcontractorId => ({
          subcontractorId,
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
      subcontractors: {
        include: {
          subcontractor: true,
        },
      },
      lineItems: true,
    },
  })

  revalidatePath('/jobs')
  return { success: true, data: job }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
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
    subcontractorIds?: string[]
    lineItems?: Array<{ id?: string; description: string; amount: number; notes?: string }>
    status?: JobStatus
    notes?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canUpdate = await hasPermission(userId, 'jobs', 'update')
    if (!canUpdate) return { success: false, error: 'You do not have permission to update jobs' }

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { employees: true, subcontractors: true, lineItems: true },
    })
    if (!existingJob) return { success: false, error: 'Job not found' }

    const entityIds = await getAccessibleEntityIds(userId)
    if (!entityIds.includes(existingJob.entityId))
      return { success: false, error: 'You do not have permission to update this job' }

    if (data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: data.clientId } })
      if (!client || client.entityId !== existingJob.entityId)
        return { success: false, error: 'Client not found or does not belong to your entity' }
    }

    if (data.employeeIds) {
      const employees = await prisma.employee.findMany({
        where: { id: { in: data.employeeIds }, entityId: existingJob.entityId },
      })
      if (employees.length !== data.employeeIds.length)
        return { success: false, error: 'One or more employees not found or do not belong to your entity' }
    }

    if (data.subcontractorIds) {
      const subcontractors = await prisma.subcontractor.findMany({
        where: { id: { in: data.subcontractorIds }, entityId: existingJob.entityId },
      })
      if (subcontractors.length !== data.subcontractorIds.length)
        return { success: false, error: 'One or more subcontractors not found or do not belong to your entity' }
    }

    if (data.jobNumber && data.jobNumber !== existingJob.jobNumber) {
      const duplicate = await prisma.job.findFirst({
        where: { entityId: existingJob.entityId, jobNumber: data.jobNumber, id: { not: id } },
      })
      if (duplicate) return { success: false, error: 'A job with this job number already exists' }
    }

    let total = existingJob.price
  if (data.lineItems) {
    total = data.lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  // Convert empty string to undefined for clientId (don't update if empty)
  const clientId = data.clientId === '' ? undefined : data.clientId

  // Update job
  const job = await prisma.job.update({
    where: { id },
    data: {
      jobNumber: data.jobNumber,
      clientId,
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
      // Update subcontractors
      ...(data.subcontractorIds !== undefined && {
        subcontractors: {
          deleteMany: {},
          create: data.subcontractorIds.map(subcontractorId => ({
            subcontractorId,
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
      subcontractors: {
        include: {
          subcontractor: true,
        },
      },
      lineItems: true,
    },
  })

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
  return { success: true, data: job }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
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
