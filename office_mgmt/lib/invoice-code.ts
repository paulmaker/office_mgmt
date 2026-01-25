'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getUserEntity } from '@/lib/platform-core/multi-tenancy'

/**
 * Generate invoice number for a client
 * Format: {REFERENCE_CODE}_{NUMBER}
 * Example: CC1_00001, CC1_00002, BS12_00001
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

  if (!client.referenceCode || client.referenceCode.trim() === '') {
    throw new Error('Client does not have a reference code. Please set one in client settings.')
  }

  // Use the full reference code as the prefix (e.g., "CC1", "BS12", "CC2")
  // Invoice numbers will be: CC11, CC12, CC13... or BS121, BS122, BS123...
  const prefix = client.referenceCode.toUpperCase().trim()
  
  // Validate format: 2 letters followed by at least one number
  if (!/^[A-Z]{2}\d+$/.test(prefix)) {
    throw new Error(`Client reference code "${client.referenceCode}" must be 2 letters followed by a number (e.g., CC1, BS12, CC2)`)
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

  // Format: REFERENCE_CODE_NUMBER (with underscore, 5-digit padding)
  // Example: CC1_00001, CC1_00002, BS12_00001
  const paddedNumber = updated.lastNumber.toString().padStart(5, '0')
  return `${updated.prefix}_${paddedNumber}`
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

  // Format: REFERENCE_CODE_NUMBER (with underscore, 5-digit padding)
  const paddedNumber = invoiceCode.lastNumber.toString().padStart(5, '0')
  return `${invoiceCode.prefix}_${paddedNumber}`
}
