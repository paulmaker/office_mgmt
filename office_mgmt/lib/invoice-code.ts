'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getUserEntity } from '@/lib/platform-core/multi-tenancy'

/**
 * Generate invoice number for a client
 * Format: {REFERENCE_CODE}{NUMBER}
 * Example: BS1, CC12, LU123
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

  // Extract prefix (2 letters) from reference code - ignore any numbers
  // Examples: "BS" -> prefix="BS" | "BS1" -> prefix="BS" | "CC12" -> prefix="CC"
  const refCode = client.referenceCode.toUpperCase()
  const match = refCode.match(/^([A-Z]{2})/)
  if (!match) {
    throw new Error('Client reference code must start with 2 letters (e.g., BS, BS1, CC12)')
  }

  const prefix = match[1] // Extract just the 2 letters for invoice prefix

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
        prefix: prefix,
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

  // Format: PREFIX + NUMBER (no underscore, no padding)
  // Example: BS1, CC12, LU123
  return `${updated.prefix}${updated.lastNumber}`
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

  // Format: PREFIX + NUMBER (no underscore, no padding)
  return `${invoiceCode.prefix}${invoiceCode.lastNumber}`
}
