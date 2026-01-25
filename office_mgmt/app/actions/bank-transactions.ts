'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import type { TransactionType } from '@prisma/client'
import { requireModule } from '@/lib/module-access'

/**
 * Get all bank transactions for the current user's accessible entities
 */
export async function getBankTransactions(filters?: {
  reconciled?: boolean
  startDate?: Date
  endDate?: Date
  type?: TransactionType
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = (session.user as any).entityId

  // Check module access
  await requireModule(entityId, 'banking')

  // Check permission
  const canRead = await hasPermission(userId, 'banking', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view bank transactions')
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

  if (filters?.reconciled !== undefined) {
    where.reconciled = filters.reconciled
  }

  if (filters?.type) {
    where.type = filters.type
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {}
    if (filters.startDate) {
      where.date.gte = filters.startDate
    }
    if (filters.endDate) {
      where.date.lte = filters.endDate
    }
  }

  // Fetch transactions scoped to accessible entities
  const transactions = await prisma.bankTransaction.findMany({
    where,
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          client: {
            select: {
              name: true,
              companyName: true,
            },
          },
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  })

  return transactions
}

/**
 * Get a single bank transaction by ID
 */
export async function getBankTransaction(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'banking', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view bank transactions')
  }

  // Get the transaction
  const transaction = await prisma.bankTransaction.findUnique({
    where: { id },
    include: {
      invoice: true,
    },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  // Verify user can access this transaction's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(transaction.entityId)) {
    throw new Error('You do not have permission to access this transaction')
  }

  return transaction
}

/**
 * Create a new bank transaction
 */
export async function createBankTransaction(data: {
  date: Date
  description: string
  amount: number
  type: TransactionType
  category?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'banking', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create bank transactions')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Create transaction
  const transaction = await prisma.bankTransaction.create({
    data: {
      entityId: userEntity.entityId,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      notes: data.notes,
    },
  })

  revalidatePath('/banking')
  return transaction
}

/**
 * Create multiple bank transactions from CSV import
 */
export async function importBankTransactionsFromCSV(
  csvData: Array<{
    date: string
    description: string
    amount: number
    type: TransactionType
    category?: string
  }>
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'banking', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to import bank transactions')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Create all transactions
  const transactions = await prisma.bankTransaction.createMany({
    data: csvData.map((row) => ({
      entityId: userEntity.entityId,
      date: new Date(row.date),
      description: row.description,
      amount: row.amount,
      type: row.type,
      category: row.category,
    })),
    skipDuplicates: true,
  })

  revalidatePath('/banking')
  return { count: transactions.count }
}

/**
 * Update an existing bank transaction
 */
export async function updateBankTransaction(
  id: string,
  data: {
    date?: Date
    description?: string
    amount?: number
    type?: TransactionType
    category?: string
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'banking', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update bank transactions')
  }

  // Get the existing transaction
  const existingTransaction = await prisma.bankTransaction.findUnique({
    where: { id },
  })

  if (!existingTransaction) {
    throw new Error('Transaction not found')
  }

  // Verify user can access this transaction's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTransaction.entityId)) {
    throw new Error('You do not have permission to update this transaction')
  }

  // Update transaction
  const transaction = await prisma.bankTransaction.update({
    where: { id },
    data: {
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      notes: data.notes,
    },
  })

  revalidatePath('/banking')
  return transaction
}

/**
 * Reconcile a transaction by linking it to an invoice or timesheet
 */
export async function reconcileTransaction(
  id: string,
  data: {
    invoiceId?: string | null
    linkedTimesheetId?: string | null
    documentUrl?: string | null
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'banking', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to reconcile transactions')
  }

  // Get the existing transaction
  const existingTransaction = await prisma.bankTransaction.findUnique({
    where: { id },
  })

  if (!existingTransaction) {
    throw new Error('Transaction not found')
  }

  // Verify user can access this transaction's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTransaction.entityId)) {
    throw new Error('You do not have permission to reconcile this transaction')
  }

  // If linking to invoice, verify it exists and belongs to same entity
  if (data.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    })
    if (!invoice) {
      throw new Error('Invoice not found')
    }
    if (invoice.entityId !== existingTransaction.entityId) {
      throw new Error('Invoice does not belong to the same entity')
    }
  }

  // If linking to timesheet, verify it exists and belongs to same entity
  if (data.linkedTimesheetId) {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: data.linkedTimesheetId },
    })
    if (!timesheet) {
      throw new Error('Timesheet not found')
    }
    if (timesheet.entityId !== existingTransaction.entityId) {
      throw new Error('Timesheet does not belong to the same entity')
    }
  }

  // Update transaction
  const transaction = await prisma.bankTransaction.update({
    where: { id },
    data: {
      invoiceId: data.invoiceId,
      linkedTimesheetId: data.linkedTimesheetId,
      documentUrl: data.documentUrl,
      notes: data.notes,
      reconciled: true,
      reconciliationDate: new Date(),
      reconciledBy: userId,
    },
  })

  revalidatePath('/banking')
  return transaction
}

/**
 * Unreconcile a transaction
 */
export async function unreconcileTransaction(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'banking', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to unreconcile transactions')
  }

  // Get the existing transaction
  const existingTransaction = await prisma.bankTransaction.findUnique({
    where: { id },
  })

  if (!existingTransaction) {
    throw new Error('Transaction not found')
  }

  // Verify user can access this transaction's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTransaction.entityId)) {
    throw new Error('You do not have permission to unreconcile this transaction')
  }

  // Update transaction
  const transaction = await prisma.bankTransaction.update({
    where: { id },
    data: {
      reconciled: false,
      reconciliationDate: null,
      reconciledBy: null,
      invoiceId: null,
      linkedTimesheetId: null,
    },
  })

  revalidatePath('/banking')
  return transaction
}

/**
 * Delete a bank transaction
 */
export async function deleteBankTransaction(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'banking', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete bank transactions')
  }

  // Get the existing transaction
  const existingTransaction = await prisma.bankTransaction.findUnique({
    where: { id },
  })

  if (!existingTransaction) {
    throw new Error('Transaction not found')
  }

  // Verify user can access this transaction's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingTransaction.entityId)) {
    throw new Error('You do not have permission to delete this transaction')
  }

  // Don't allow deletion of reconciled transactions
  if (existingTransaction.reconciled) {
    throw new Error('Cannot delete a reconciled transaction')
  }

  // Delete transaction
  await prisma.bankTransaction.delete({
    where: { id },
  })

  revalidatePath('/banking')
}
