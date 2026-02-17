'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'

/**
 * Generate invoice number for a client
 * Format: {REFERENCE_CODE}_{NUMBER}
 * Example: JOH_00001, JOH_00002, SMI_00001
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

  // Use the 3-letter reference code as the prefix (e.g., "JOH", "SMI", "ABC")
  // Invoice numbers will be: JOH_00001, JOH_00002, SMI_00001...
  const prefix = client.referenceCode.toUpperCase().trim()
  
  // Validate format: exactly 3 uppercase letters
  if (!/^[A-Z]{3}$/.test(prefix)) {
    throw new Error(`Client reference code "${client.referenceCode}" must be exactly 3 uppercase letters (e.g., JOH, SMI, ABC)`)
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
