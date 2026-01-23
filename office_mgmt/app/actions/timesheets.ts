'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import { calculateCISDeduction } from '@/lib/utils'
import type { TimesheetStatus, CISStatus } from '@prisma/client'

/**
 * Get all timesheets for the current user's accessible entities
 */
export async function getTimesheets() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'timesheets', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view timesheets')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch timesheets scoped to accessible entities
  const timesheets = await prisma.timesheet.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
    include: {
      subcontractor: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return timesheets
}

/**
 * Get a single timesheet by ID
 */
export async function getTimesheet(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'timesheets', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view timesheets')
  }

  // Get the timesheet
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      subcontractor: true,
    },
  })

  if (!timesheet) {
    throw new Error('Timesheet not found')
  }

  // Verify user can access this timesheet's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(timesheet.entityId)) {
    throw new Error('You do not have permission to access this timesheet')
  }

  return timesheet
}

/**
 * Create a new timesheet
 */
export async function createTimesheet(data: {
  subcontractorId: string
  periodStart: Date
  periodEnd: Date
  hoursWorked: number
  rate: number
  additionalHours?: number
  additionalHoursRate?: number
  expenses?: number
  receiptsReceived?: boolean
  submittedDate?: Date
  submittedVia?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'timesheets', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create timesheets')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Verify subcontractor belongs to user's entity
  const subcontractor = await prisma.subcontractor.findUnique({
    where: { id: data.subcontractorId },
  })

  if (!subcontractor) {
    throw new Error('Subcontractor not found')
  }

  if (subcontractor.entityId !== userEntity.entityId) {
    throw new Error('Subcontractor does not belong to your entity')
  }

  // Calculate amounts
  const regularAmount = data.hoursWorked * data.rate
  const additionalHours = data.additionalHours || 0
  const additionalHoursRate = data.additionalHoursRate || 0
  const additionalAmount = additionalHours * additionalHoursRate
  const grossAmount = regularAmount + additionalAmount
  const cisDeduction = calculateCISDeduction(grossAmount, subcontractor.cisStatus)
  const expenses = data.expenses || 0
  const netAmount = grossAmount - cisDeduction + expenses

  // Create timesheet
  const timesheet = await prisma.timesheet.create({
    data: {
      entityId: userEntity.entityId,
      subcontractorId: data.subcontractorId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      hoursWorked: data.hoursWorked,
      rate: data.rate,
      additionalHours,
      additionalHoursRate,
      grossAmount,
      cisDeduction,
      expenses,
      netAmount,
      receiptsReceived: data.receiptsReceived || false,
      submittedDate: data.submittedDate,
      submittedVia: data.submittedVia || 'MANUAL',
      status: 'SUBMITTED',
      notes: data.notes,
    },
    include: {
      subcontractor: true,
    },
  })

  revalidatePath('/timesheets')
  return timesheet
}

/**
 * Update an existing timesheet
 */
export async function updateTimesheet(
  id: string,
  data: {
    subcontractorId?: string
    periodStart?: Date
    periodEnd?: Date
    hoursWorked?: number
    rate?: number
    additionalHours?: number
    additionalHoursRate?: number
    expenses?: number
    receiptsReceived?: boolean
    submittedDate?: Date
    submittedVia?: string
    status?: TimesheetStatus
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'timesheets', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update timesheets')
  }

  // Get the existing timesheet
  const existingTimesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      subcontractor: true,
    },
  })

  if (!existingTimesheet) {
    throw new Error('Timesheet not found')
  }

  // Verify user can access this timesheet's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTimesheet.entityId)) {
    throw new Error('You do not have permission to update this timesheet')
  }

  // Get subcontractor (use existing or new)
  const subcontractorId = data.subcontractorId || existingTimesheet.subcontractorId
  const subcontractor = await prisma.subcontractor.findUnique({
    where: { id: subcontractorId },
  })

  if (!subcontractor) {
    throw new Error('Subcontractor not found')
  }

  // Calculate amounts
  const hoursWorked = data.hoursWorked ?? existingTimesheet.hoursWorked
  const rate = data.rate ?? existingTimesheet.rate
  const additionalHours = data.additionalHours ?? (existingTimesheet as any).additionalHours ?? 0
  const additionalHoursRate = data.additionalHoursRate ?? (existingTimesheet as any).additionalHoursRate ?? 0
  const regularAmount = hoursWorked * rate
  const additionalAmount = additionalHours * additionalHoursRate
  const grossAmount = regularAmount + additionalAmount
  const cisDeduction = calculateCISDeduction(grossAmount, subcontractor.cisStatus)
  const expenses = data.expenses ?? existingTimesheet.expenses
  const netAmount = grossAmount - cisDeduction + expenses

  // Update timesheet
  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: {
      subcontractorId: data.subcontractorId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      hoursWorked,
      rate,
      additionalHours,
      additionalHoursRate,
      grossAmount,
      cisDeduction,
      expenses,
      netAmount,
      receiptsReceived: data.receiptsReceived,
      submittedDate: data.submittedDate,
      submittedVia: data.submittedVia,
      status: data.status,
      notes: data.notes,
    },
    include: {
      subcontractor: true,
    },
  })

  revalidatePath('/timesheets')
  revalidatePath(`/timesheets/${id}`)
  return timesheet
}

/**
 * Approve a timesheet
 */
export async function approveTimesheet(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canApprove = await hasPermission(userId, 'timesheets', 'approve')
  if (!canApprove) {
    throw new Error('You do not have permission to approve timesheets')
  }

  // Get the existing timesheet
  const existingTimesheet = await prisma.timesheet.findUnique({
    where: { id },
  })

  if (!existingTimesheet) {
    throw new Error('Timesheet not found')
  }

  // Verify user can access this timesheet's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTimesheet.entityId)) {
    throw new Error('You do not have permission to approve this timesheet')
  }

  // Update timesheet
  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    },
  })

  revalidatePath('/timesheets')
  revalidatePath('/payroll')
  return timesheet
}

/**
 * Reject a timesheet
 */
export async function rejectTimesheet(id: string, reason?: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canApprove = await hasPermission(userId, 'timesheets', 'approve')
  if (!canApprove) {
    throw new Error('You do not have permission to reject timesheets')
  }

  // Get the existing timesheet
  const existingTimesheet = await prisma.timesheet.findUnique({
    where: { id },
  })

  if (!existingTimesheet) {
    throw new Error('Timesheet not found')
  }

  // Verify user can access this timesheet's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTimesheet.entityId)) {
    throw new Error('You do not have permission to reject this timesheet')
  }

  // Update timesheet
  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: {
      status: 'REJECTED',
      notes: reason ? `${existingTimesheet.notes || ''}\nRejected: ${reason}`.trim() : existingTimesheet.notes,
    },
  })

  revalidatePath('/timesheets')
  return timesheet
}

/**
 * Delete a timesheet
 */
export async function deleteTimesheet(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'timesheets', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete timesheets')
  }

  // Get the existing timesheet
  const existingTimesheet = await prisma.timesheet.findUnique({
    where: { id },
  })

  if (!existingTimesheet) {
    throw new Error('Timesheet not found')
  }

  // Verify user can access this timesheet's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTimesheet.entityId)) {
    throw new Error('You do not have permission to delete this timesheet')
  }

  // Don't allow deletion of processed/paid timesheets
  if (existingTimesheet.status === 'PROCESSED' || existingTimesheet.status === 'PAID') {
    throw new Error('Cannot delete a processed or paid timesheet')
  }

  // Delete timesheet
  await prisma.timesheet.delete({
    where: { id },
  })

  revalidatePath('/timesheets')
}
