'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity } from '@/lib/platform-core/multi-tenancy'
import { requireSessionEntityId } from '@/lib/session-entity'
import { revalidatePath } from 'next/cache'
import type { JobStatus } from '@prisma/client'
import { requireModule } from '@/lib/module-access'
import { resend, EMAIL_FROM } from '@/lib/email'
import { formatDate } from '@/lib/utils'

/**
 * Get all jobs for the current user's accessible entities
 */
export async function getJobs() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = requireSessionEntityId(session)

  // Check module access
  await requireModule(entityId, 'jobs')

  // Check permission
  const canRead = await hasPermission(userId, 'jobs', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view jobs')
  }

  // Fetch jobs scoped to current session entity
  const jobs = await prisma.job.findMany({
    where: { entityId },
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

  const entityId = requireSessionEntityId(session)
  if (job.entityId !== entityId) {
    throw new Error('You do not have permission to access this job')
  }

  return job
}

/**
 * Generate the next job number for an entity
 */
async function generateJobNumber(entityId: string): Promise<string> {
  // Find the highest existing job number for this entity
  const lastJob = await prisma.job.findFirst({
    where: { 
      entityId,
      jobNumber: { startsWith: 'JOB-' }
    },
    orderBy: { jobNumber: 'desc' },
  })

  if (!lastJob) {
    return 'JOB-0001'
  }

  // Extract the number part and increment
  const match = lastJob.jobNumber.match(/JOB-(\d+)/)
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1
    return `JOB-${nextNum.toString().padStart(4, '0')}`
  }

  // Fallback: count all jobs and add 1
  const count = await prisma.job.count({ where: { entityId } })
  return `JOB-${(count + 1).toString().padStart(4, '0')}`
}

/**
 * Create a new job
 */
export async function createJob(data: {
  jobNumber?: string
  clientId: string
  jobDescription: string
  dateWorkCommenced: Date
  employeeIds: string[]
  subcontractorIds?: string[]
  lineItems: Array<{ address?: string; description: string; amount: number; notes?: string }>
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

    // Get all accessible entity IDs for this user
    const entityId = requireSessionEntityId(session)

    const client = await prisma.client.findUnique({ where: { id: data.clientId } })
    if (!client) return { success: false, error: 'Client not found' }
    if (client.entityId !== entityId) return { success: false, error: 'Client does not belong to your entity' }

    const jobEntityId = entityId

    if (data.employeeIds.length > 0) {
      const employees = await prisma.employee.findMany({
        where: { id: { in: data.employeeIds }, entityId: jobEntityId },
      })
      if (employees.length !== data.employeeIds.length)
        return { success: false, error: 'One or more employees not found or do not belong to the client\'s entity' }
    }

    const subcontractorIds = data.subcontractorIds || []
    if (subcontractorIds.length > 0) {
      const subcontractors = await prisma.subcontractor.findMany({
        where: { id: { in: subcontractorIds }, entityId: jobEntityId },
      })
      if (subcontractors.length !== subcontractorIds.length)
        return { success: false, error: 'One or more subcontractors not found or do not belong to the client\'s entity' }
    }

    const total = data.lineItems.reduce((sum, item) => sum + item.amount, 0)

    // Auto-generate job number if not provided
    const jobNumber = data.jobNumber?.trim() || await generateJobNumber(jobEntityId)

    const existingJob = await prisma.job.findFirst({
      where: { entityId: jobEntityId, jobNumber },
    })
    if (existingJob) return { success: false, error: 'A job with this job number already exists' }

    const job = await prisma.job.create({
    data: {
      entityId: jobEntityId,
      jobNumber,
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
          address: item.address?.trim() || null,
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
    lineItems?: Array<{ id?: string; address?: string; description: string; amount: number; notes?: string }>
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

    const entityId = requireSessionEntityId(session)
    if (existingJob.entityId !== entityId)
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
            address: item.address?.trim() || null,
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
  const entityId = requireSessionEntityId(session)
  if (existingJob.entityId !== entityId) {
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

  const entityId = requireSessionEntityId(session)

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  if (client.entityId !== entityId) {
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

/**
 * Send job sheet email to all assigned subcontractors (contractors).
 * Email includes address, description, job commencement, notes, and line items without prices.
 */
export async function sendJobSheetEmail(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canRead = await hasPermission(userId, 'jobs', 'read')
    if (!canRead) return { success: false, error: 'You do not have permission to view jobs' }

    const entityId = requireSessionEntityId(session)

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        client: true,
        subcontractors: {
          include: {
            subcontractor: true,
          },
        },
        lineItems: true,
      },
    })

    if (!job) return { success: false, error: 'Job not found' }
    if (job.entityId !== entityId) return { success: false, error: 'You do not have permission to access this job' }

    const contractorsWithEmail = job.subcontractors.filter(
      (js) => js.subcontractor.email?.trim()
    )
    if (contractorsWithEmail.length === 0) {
      return { success: false, error: 'No contractors with email addresses are assigned to this job' }
    }

    const lineItemsHtml = job.lineItems
      .map(
        (li) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml((li as { address?: string | null }).address || '')}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(li.description)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(li.notes || '')}</td></tr>`
      )
      .join('')

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="margin-bottom:16px">Job Sheet: ${escapeHtml(job.jobNumber)}</h2>
        <p><strong>Description:</strong><br/>${escapeHtml(job.jobDescription)}</p>
        <p><strong>Job commencement:</strong> ${formatDate(job.dateWorkCommenced)}</p>
        ${job.notes ? `<p><strong>Notes:</strong><br/>${escapeHtml(job.notes)}</p>` : ''}
        <p><strong>Line items (no prices):</strong></p>
        <table style="width:100%;border-collapse:collapse;margin-top:8px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px 12px;text-align:left">Address</th>
              <th style="padding:8px 12px;text-align:left">Description</th>
              <th style="padding:8px 12px;text-align:left">Notes</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>
        <p style="margin-top:24px;color:#666;font-size:12px">This is a job sheet from your client. Do not reply to this email.</p>
      </div>
    `

    const subject = `Job Sheet: ${job.jobNumber} - ${job.jobDescription.slice(0, 50)}${job.jobDescription.length > 50 ? '...' : ''}`

    for (const { subcontractor } of contractorsWithEmail) {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: subcontractor.email,
        subject,
        html,
      })
    }

    revalidatePath('/jobs')
    return { success: true }
  } catch (e) {
    console.error('sendJobSheetEmail error:', e)
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to send job sheet email',
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
