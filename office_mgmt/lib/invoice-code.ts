'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getUserEntity } from '@/lib/platform-core/multi-tenancy'

/**
 * Generate invoice number for a client
 * Format: {REFERENCE_CODE}_{NUMBER}
 * Example: LU_00001, ABC_00002
 */
export async function generateInvoiceNumber(clientId: string): Promise<string> {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Get the client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  if (!client.referenceCode) {
    throw new Error('Client does not have a reference code. Please set one in client settings.')
  }

  // Get or create InvoiceCode record for this client
  let invoiceCode = await prisma.invoiceCode.findUnique({
    where: {
      entityId_clientId: {
        entityId: client.entityId,
        clientId: client.id,
      },
    },
  })

  if (!invoiceCode) {
    // Create new InvoiceCode record
    invoiceCode = await prisma.invoiceCode.create({
      data: {
        entityId: client.entityId,
        clientId: client.id,
        prefix: client.referenceCode,
        lastNumber: 0,
      },
    })
  }

  // Increment and update last number (atomic operation)
  const updated = await prisma.invoiceCode.update({
    where: { id: invoiceCode.id },
    data: {
      lastNumber: {
        increment: 1,
      },
    },
  })

  // Format: PREFIX_00001 (5 digits)
  const number = updated.lastNumber.toString().padStart(5, '0')
  return `${updated.prefix}_${number}`
}

/**
 * Get current invoice number for a client (without incrementing)
 */
export async function getCurrentInvoiceNumber(clientId: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  })

  if (!client || !client.referenceCode) {
    return null
  }

  const invoiceCode = await prisma.invoiceCode.findUnique({
    where: {
      entityId_clientId: {
        entityId: client.entityId,
        clientId: client.id,
      },
    },
  })

  if (!invoiceCode) {
    return null
  }

  const number = invoiceCode.lastNumber.toString().padStart(5, '0')
  return `${invoiceCode.prefix}_${number}`
}
