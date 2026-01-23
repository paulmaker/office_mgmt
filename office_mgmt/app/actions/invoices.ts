'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import { generateInvoiceNumber } from '@/lib/invoice-code'
import type { InvoiceType, InvoiceStatus } from '@prisma/client'

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
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return invoices
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

  return invoice
}

/**
 * Create a new invoice
 */
export async function createInvoice(data: {
  type: InvoiceType
  clientId?: string
  subcontractorId?: string
  supplierId?: string
  date: Date
  dueDate: Date
  lineItems: InvoiceLineItem[]
  vatRate?: number
  reverseCharge?: boolean
  cisDeduction?: number
  cisRate?: number
  status?: InvoiceStatus
  notes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'invoices', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create invoices')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Validate that we have either client, subcontractor, or supplier
  if (!data.clientId && !data.subcontractorId && !data.supplierId) {
    throw new Error('Invoice must have a client, subcontractor, or supplier')
  }

  // For sales invoices, require client and generate invoice number
  let invoiceNumber = ''
  if (data.type === 'SALES') {
    if (!data.clientId) {
      throw new Error('Sales invoices require a client')
    }
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
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0)

  // Calculate VAT
  let vatAmount = 0
  if (!data.reverseCharge && data.vatRate) {
    vatAmount = subtotal * (data.vatRate / 100)
  }

  // Calculate total
  const total = subtotal + vatAmount - (data.cisDeduction || 0)

  // Check if invoice number already exists in entity
  const existing = await prisma.invoice.findFirst({
    where: {
      entityId: userEntity.entityId,
      invoiceNumber,
    },
  })

  if (existing) {
    throw new Error('Invoice number already exists. Please try again.')
  }

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      entityId: userEntity.entityId,
      invoiceNumber,
      type: data.type,
      clientId: data.clientId,
      subcontractorId: data.subcontractorId,
      supplierId: data.supplierId,
      date: data.date,
      dueDate: data.dueDate,
      subtotal,
      vatAmount,
      vatRate: data.vatRate || 20,
      reverseCharge: data.reverseCharge || false,
      cisDeduction: data.cisDeduction || 0,
      cisRate: data.cisRate || 0,
      total,
      status: data.status || 'DRAFT',
      lineItems: data.lineItems as any,
      notes: data.notes,
    },
    include: {
      client: true,
      subcontractor: true,
      supplier: true,
    },
  })

  revalidatePath('/invoices')
  return invoice
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
    date?: Date
    dueDate?: Date
    lineItems?: InvoiceLineItem[]
    vatRate?: number
    reverseCharge?: boolean
    cisDeduction?: number
    cisRate?: number
    status?: InvoiceStatus
    notes?: string
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

  // Calculate subtotal from line items if provided
  let subtotal = existingInvoice.subtotal
  if (data.lineItems) {
    subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

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

  // Update invoice
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      clientId: data.clientId,
      subcontractorId: data.subcontractorId,
      supplierId: data.supplierId,
      date: data.date,
      dueDate: data.dueDate,
      subtotal,
      vatAmount,
      vatRate,
      reverseCharge,
      cisDeduction,
      cisRate: data.cisRate,
      total,
      status: data.status,
      lineItems: data.lineItems as any,
      notes: data.notes,
    },
    include: {
      client: true,
      subcontractor: true,
      supplier: true,
    },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return invoice
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

  // Update invoice
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'PAID',
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
    },
  })

  revalidatePath('/invoices')
  return invoice
}
