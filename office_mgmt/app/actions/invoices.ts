'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import { generateInvoiceNumber } from '@/lib/invoice-code'
import type { InvoiceType, InvoiceStatus } from '@prisma/client'
import { requireModule } from '@/lib/module-access'

interface InvoiceLineItem {
  jobId?: string
  jobNumber?: string
  description: string
  quantity?: number
  rate?: number
  amount: number
}

/**
 * Get all invoices for the current user's accessible entities
 */
export async function getInvoices() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = (session.user as any).entityId

  // Check module access
  await requireModule(entityId, 'invoices')

  // Check permission
  const canRead = await hasPermission(userId, 'invoices', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view invoices')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch invoices scoped to accessible entities
  const invoices = await prisma.invoice.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
    include: {
      client: true,
      subcontractor: true,
      supplier: true,
      job: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  
  // Calculate outstandingAmount for each invoice
  return invoices.map(inv => ({
    ...inv,
    outstandingAmount: inv.total - inv.paidAmount,
  }))
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'invoices', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view invoices')
  }

  // Get the invoice
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      subcontractor: true,
      supplier: true,
      job: true,
    },
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Verify user can access this invoice's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(invoice.entityId)) {
    throw new Error('You do not have permission to access this invoice')
  }

  // Calculate outstandingAmount
  return {
    ...invoice,
    outstandingAmount: invoice.total - invoice.paidAmount,
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(data: {
  type: InvoiceType
  clientId?: string
  subcontractorId?: string
  supplierId?: string
  jobId?: string
  date: Date
  dueDate: Date
  sentDate?: Date
  receivedDate?: Date
  lineItems: InvoiceLineItem[]
  description?: string
  discountAmount?: number
  discountPercentage?: number
  discountType?: string
  vatRate?: number
  reverseCharge?: boolean
  cisDeduction?: number
  cisRate?: number
  purchaseOrderNumber?: string
  status?: InvoiceStatus
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canCreate = await hasPermission(userId, 'invoices', 'create')
    if (!canCreate) return { success: false, error: 'You do not have permission to create invoices' }

    const userEntity = await getUserEntity(userId)
    if (!userEntity) return { success: false, error: 'User entity not found' }

    if (!data.clientId && !data.subcontractorId && !data.supplierId)
      return { success: false, error: 'Invoice must have a client, subcontractor, or supplier' }

  let invoiceNumber = ''
  if (data.type === 'SALES') {
    if (!data.clientId) return { success: false, error: 'Sales invoices require a client' }
    invoiceNumber = await generateInvoiceNumber(data.clientId)
  } else {
    // For purchase invoices, use a simple format
    const prefix = data.supplierId ? 'PO' : 'PI'
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    invoiceNumber = `${prefix}-${year}${month}-${random}`
  }

  // Calculate subtotal from line items
  let subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0)

  // Apply discount
  const discountAmount = data.discountAmount || 0
  const discountPercentage = data.discountPercentage || 0
  let discount = 0
  if (data.discountType === 'PERCENTAGE' && discountPercentage > 0) {
    discount = subtotal * (discountPercentage / 100)
  } else if (data.discountType === 'FIXED' && discountAmount > 0) {
    discount = discountAmount
  }
  subtotal = subtotal - discount

  // Calculate VAT on discounted subtotal
  let vatAmount = 0
  if (!data.reverseCharge && data.vatRate) {
    vatAmount = subtotal * (data.vatRate / 100)
  }

  // Calculate total
  const total = subtotal + vatAmount - (data.cisDeduction || 0)
  const outstandingAmount = total // New invoice has no payments yet

  // Check if invoice number already exists in entity
  const existing = await prisma.invoice.findFirst({
    where: {
      entityId: userEntity.entityId,
      invoiceNumber,
    },
  })

  if (existing) return { success: false, error: 'Invoice number already exists. Please try again.' }

  const invoice = await prisma.invoice.create({
    data: {
      entityId: userEntity.entityId,
      invoiceNumber,
      type: data.type,
      clientId: data.clientId,
      subcontractorId: data.subcontractorId,
      supplierId: data.supplierId,
      jobId: data.jobId,
      date: data.date,
      dueDate: data.dueDate,
      sentDate: data.sentDate,
      receivedDate: data.receivedDate,
      subtotal,
      discountAmount: discount,
      discountPercentage: data.discountPercentage || 0,
      discountType: data.discountType,
      vatAmount,
      vatRate: data.vatRate || 20,
      reverseCharge: data.reverseCharge || false,
      cisDeduction: data.cisDeduction || 0,
      cisRate: data.cisRate || 0,
      total,
      paidAmount: 0,
      outstandingAmount,
      status: data.status || 'DRAFT',
      purchaseOrderNumber: data.purchaseOrderNumber,
      description: data.description,
      lineItems: data.lineItems as any,
      notes: data.notes,
    },
    include: {
      client: true,
      subcontractor: true,
      supplier: true,
      job: true,
    },
  })

  revalidatePath('/invoices')
  return { success: true, data: invoice }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
  id: string,
  data: {
    clientId?: string
    subcontractorId?: string
    supplierId?: string
    jobId?: string
    date?: Date
    dueDate?: Date
    sentDate?: Date
    receivedDate?: Date
    lineItems?: InvoiceLineItem[]
    description?: string
    discountAmount?: number
    discountPercentage?: number
    discountType?: string
    vatRate?: number
    reverseCharge?: boolean
    cisDeduction?: number
    cisRate?: number
    purchaseOrderNumber?: string
    status?: InvoiceStatus
    notes?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canUpdate = await hasPermission(userId, 'invoices', 'update')
    if (!canUpdate) return { success: false, error: 'You do not have permission to update invoices' }

    const existingInvoice = await prisma.invoice.findUnique({ where: { id } })
    if (!existingInvoice) return { success: false, error: 'Invoice not found' }

    const entityIds = await getAccessibleEntityIds(userId)
    if (!entityIds.includes(existingInvoice.entityId))
      return { success: false, error: 'You do not have permission to update this invoice' }

    let subtotal = existingInvoice.subtotal
  if (data.lineItems) {
    subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  // Apply discount
  const discountAmount = data.discountAmount ?? existingInvoice.discountAmount ?? 0
  const discountPercentage = data.discountPercentage ?? existingInvoice.discountPercentage ?? 0
  const discountType = data.discountType ?? existingInvoice.discountType
  let discount = 0
  if (discountType === 'PERCENTAGE' && discountPercentage > 0) {
    discount = subtotal * (discountPercentage / 100)
  } else if (discountType === 'FIXED' && discountAmount > 0) {
    discount = discountAmount
  }
  subtotal = subtotal - discount

  // Calculate VAT
  const vatRate = data.vatRate ?? existingInvoice.vatRate
  const reverseCharge = data.reverseCharge ?? existingInvoice.reverseCharge
  let vatAmount = 0
  if (!reverseCharge && vatRate) {
    vatAmount = subtotal * (vatRate / 100)
  }

  // Calculate total
  const cisDeduction = data.cisDeduction ?? existingInvoice.cisDeduction
  const total = subtotal + vatAmount - cisDeduction
  const outstandingAmount = total - existingInvoice.paidAmount

  // Update invoice
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      clientId: data.clientId,
      subcontractorId: data.subcontractorId,
      supplierId: data.supplierId,
      jobId: data.jobId,
      date: data.date,
      dueDate: data.dueDate,
      sentDate: data.sentDate,
      receivedDate: data.receivedDate,
      subtotal,
      discountAmount: discount,
      discountPercentage: data.discountPercentage,
      discountType: data.discountType,
      vatAmount,
      vatRate,
      reverseCharge,
      cisDeduction,
      cisRate: data.cisRate,
      total,
      outstandingAmount,
      purchaseOrderNumber: data.purchaseOrderNumber,
      description: data.description,
      status: data.status,
      lineItems: data.lineItems as any,
      notes: data.notes,
    },
    include: {
      client: true,
      subcontractor: true,
      supplier: true,
      job: true,
    },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { success: true, data: invoice }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'invoices', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete invoices')
  }

  // Get the existing invoice
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id },
  })

  if (!existingInvoice) {
    throw new Error('Invoice not found')
  }

  // Verify user can access this invoice's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingInvoice.entityId)) {
    throw new Error('You do not have permission to delete this invoice')
  }

  // Don't allow deletion of paid invoices
  if (existingInvoice.status === 'PAID') {
    throw new Error('Cannot delete a paid invoice')
  }

  // Delete invoice
  await prisma.invoice.delete({
    where: { id },
  })

  revalidatePath('/invoices')
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(
  id: string,
  data: {
    paymentDate: Date
    paymentMethod?: string
    paymentReference?: string
    paidAmount?: number
  }
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'invoices', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update invoices')
  }

  // Get the existing invoice
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id },
  })

  if (!existingInvoice) {
    throw new Error('Invoice not found')
  }

  // Verify user can access this invoice's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingInvoice.entityId)) {
    throw new Error('You do not have permission to update this invoice')
  }

  // Calculate paid amount and outstanding
  const paidAmount = data.paidAmount ?? existingInvoice.total
  const outstandingAmount = existingInvoice.total - paidAmount
  const newStatus = outstandingAmount <= 0 ? 'PAID' : existingInvoice.status

  // Update invoice
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: newStatus,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
      paidAmount,
      outstandingAmount,
    },
  })

  revalidatePath('/invoices')
  return invoice
}
