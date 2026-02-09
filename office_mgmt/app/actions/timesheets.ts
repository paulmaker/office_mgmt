'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity } from '@/lib/platform-core/multi-tenancy'
import { requireSessionEntityId } from '@/lib/session-entity'
import { revalidatePath } from 'next/cache'
import { calculateCISDeduction } from '@/lib/utils'
import type { TimesheetStatus, TimesheetRateType } from '@prisma/client'
import { requireModule } from '@/lib/module-access'

/**
 * Get all timesheets for the current user's accessible entities
 */
export async function getTimesheets() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = requireSessionEntityId(session)

  // Check module access
  await requireModule(entityId, 'timesheets')

  // Check permission
  const canRead = await hasPermission(userId, 'timesheets', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view timesheets')
  }

  const timesheets = await prisma.timesheet.findMany({
    where: { entityId },
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

  const entityId = requireSessionEntityId(session)
  if (timesheet.entityId !== entityId) {
    throw new Error('You do not have permission to access this timesheet')
  }

  return timesheet
}

/**
 * Create a new timesheet
 */
function computeRegularAmount(
  rateType: TimesheetRateType,
  rate: number,
  hoursWorked: number,
  daysWorked: number | null | undefined
): number {
  if (rateType === 'DAILY' && daysWorked != null) {
    return daysWorked * rate
  }
  return hoursWorked * rate
}

export async function createTimesheet(data: {
  subcontractorId: string
  periodStart: Date
  periodEnd: Date
  rateType?: TimesheetRateType
  hoursWorked: number
  daysWorked?: number | null
  rate: number
  additionalHours?: number
  additionalHoursRate?: number
  expenses?: number
  receiptsReceived?: boolean
  receiptDocumentKeys?: string[] | null
  submittedDate?: Date
  submittedVia?: string
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canCreate = await hasPermission(userId, 'timesheets', 'create')
    if (!canCreate) return { success: false, error: 'You do not have permission to create timesheets' }

    const entityId = requireSessionEntityId(session)

    const subcontractor = await prisma.subcontractor.findUnique({ where: { id: data.subcontractorId } })
    if (!subcontractor) return { success: false, error: 'Subcontractor not found' }
    if (subcontractor.entityId !== entityId)
      return { success: false, error: 'Subcontractor does not belong to your entity' }

    const timesheetEntityId = entityId
    const rateType = data.rateType ?? 'HOURLY'
    const regularAmount = computeRegularAmount(rateType, data.rate, data.hoursWorked, data.daysWorked)
    const additionalHours = data.additionalHours || 0
    const additionalHoursRate = data.additionalHoursRate || 0
    const additionalAmount = additionalHours * additionalHoursRate
    const grossAmount = regularAmount + additionalAmount
    const cisDeduction = calculateCISDeduction(grossAmount, subcontractor.cisStatus)
    const expenses = data.expenses || 0
    const netAmount = grossAmount - cisDeduction + expenses

    try {
      const timesheet = await prisma.timesheet.create({
        data: {
          entityId: timesheetEntityId,
          subcontractorId: data.subcontractorId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          rateType,
          hoursWorked: data.hoursWorked,
          daysWorked: data.daysWorked ?? undefined,
          rate: data.rate,
          additionalHours,
          additionalHoursRate,
          grossAmount,
          cisDeduction,
          expenses,
          netAmount,
          receiptsReceived: data.receiptsReceived || false,
          receiptDocumentKeys: data.receiptDocumentKeys && data.receiptDocumentKeys.length > 0 ? data.receiptDocumentKeys : undefined,
          submittedDate: data.submittedDate,
          submittedVia: data.submittedVia || 'MANUAL',
          status: 'SUBMITTED',
          notes: data.notes,
        },
        include: { subcontractor: true },
      })
      revalidatePath('/timesheets')
      return { success: true, data: timesheet }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string }
      const errorMessage = err?.message || ''
      const errorCode = err?.code || ''
      if (
        errorMessage.includes('additionalHours') ||
        (errorMessage.includes('column') && errorMessage.includes('does not exist')) ||
        errorCode === 'P2001' ||
        errorCode === 'P2010' ||
        errorCode === '42703'
      ) {
        const timesheet = await prisma.timesheet.create({
          data: {
            entityId: timesheetEntityId,
            subcontractorId: data.subcontractorId,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            rateType,
            hoursWorked: data.hoursWorked,
            daysWorked: data.daysWorked ?? undefined,
            rate: data.rate,
            grossAmount,
            cisDeduction,
            expenses,
            netAmount,
            receiptsReceived: data.receiptsReceived || false,
            receiptDocumentKeys: data.receiptDocumentKeys && data.receiptDocumentKeys.length > 0 ? data.receiptDocumentKeys : undefined,
            submittedDate: data.submittedDate,
            submittedVia: data.submittedVia || 'MANUAL',
            status: 'SUBMITTED',
            notes: data.notes,
          },
          include: { subcontractor: true },
        })
        revalidatePath('/timesheets')
        return { success: true, data: timesheet }
      }
      return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
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
    rateType?: TimesheetRateType
    hoursWorked?: number
    daysWorked?: number | null
    rate?: number
    additionalHours?: number
    additionalHoursRate?: number
    expenses?: number
    receiptsReceived?: boolean
    receiptDocumentKeys?: string[] | null
    submittedDate?: Date
    submittedVia?: string
    status?: TimesheetStatus
    notes?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canUpdate = await hasPermission(userId, 'timesheets', 'update')
    if (!canUpdate) return { success: false, error: 'You do not have permission to update timesheets' }

    const existingTimesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: { subcontractor: true },
    })
    if (!existingTimesheet) return { success: false, error: 'Timesheet not found' }

    const entityId = requireSessionEntityId(session)
    if (existingTimesheet.entityId !== entityId)
      return { success: false, error: 'You do not have permission to update this timesheet' }

    const subcontractorId = (data.subcontractorId && data.subcontractorId.trim() !== '')
      ? data.subcontractorId
      : existingTimesheet.subcontractorId
    const subcontractor = await prisma.subcontractor.findUnique({ where: { id: subcontractorId } })
    if (!subcontractor) return { success: false, error: 'Subcontractor not found' }

    const rateType = data.rateType ?? existingTimesheet.rateType
    const hoursWorked = data.hoursWorked ?? existingTimesheet.hoursWorked
    const daysWorked = data.daysWorked !== undefined ? data.daysWorked : existingTimesheet.daysWorked
    const rate = data.rate ?? existingTimesheet.rate
    const additionalHours = data.additionalHours ?? existingTimesheet.additionalHours ?? 0
    const additionalHoursRate = data.additionalHoursRate ?? existingTimesheet.additionalHoursRate ?? 0
    const regularAmount = computeRegularAmount(rateType, rate, hoursWorked, daysWorked)
    const additionalAmount = additionalHours * additionalHoursRate
    const grossAmount = regularAmount + additionalAmount
    const cisDeduction = calculateCISDeduction(grossAmount, subcontractor.cisStatus)
    const expenses = data.expenses ?? existingTimesheet.expenses
    const netAmount = grossAmount - cisDeduction + expenses

    const updateSubcontractorId = (data.subcontractorId && data.subcontractorId.trim() !== '')
      ? data.subcontractorId
      : undefined

    const timesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        subcontractorId: updateSubcontractorId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        rateType,
        hoursWorked,
        daysWorked: daysWorked ?? undefined,
        rate,
        additionalHours,
        additionalHoursRate,
        grossAmount,
        cisDeduction,
        expenses,
        netAmount,
        receiptsReceived: data.receiptsReceived,
        receiptDocumentKeys: data.receiptDocumentKeys !== undefined
          ? (data.receiptDocumentKeys && data.receiptDocumentKeys.length > 0 ? data.receiptDocumentKeys : Prisma.JsonNull)
          : undefined,
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
    return { success: true, data: timesheet }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
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
  const entityId = requireSessionEntityId(session)
  if (existingTimesheet.entityId !== entityId) {
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
 * Mark a timesheet as paid
 */
export async function markTimesheetAsPaid(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canApprove = await hasPermission(userId, 'timesheets', 'approve')
  if (!canApprove) {
    throw new Error('You do not have permission to mark timesheets as paid')
  }

  // Get the existing timesheet
  const existingTimesheet = await prisma.timesheet.findUnique({
    where: { id },
  })

  if (!existingTimesheet) {
    throw new Error('Timesheet not found')
  }

  // Verify user can access this timesheet's entity
  const entityId = requireSessionEntityId(session)
  if (existingTimesheet.entityId !== entityId) {
    throw new Error('You do not have permission to mark this timesheet as paid')
  }

  // Only approved or processed timesheets can be marked as paid
  if (existingTimesheet.status !== 'APPROVED' && existingTimesheet.status !== 'PROCESSED') {
    throw new Error('Only approved or processed timesheets can be marked as paid')
  }

  // Update timesheet
  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
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
  const entityId = requireSessionEntityId(session)
  if (existingTimesheet.entityId !== entityId) {
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
  const entityId = requireSessionEntityId(session)
  if (existingTimesheet.entityId !== entityId) {
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
