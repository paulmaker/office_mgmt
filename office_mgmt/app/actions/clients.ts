'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { revalidatePath } from 'next/cache'
import { generateReferenceCode } from '@/lib/utils'
import { requireModule } from '@/lib/module-access'

/**
 * Get all clients for the current user's accessible entities
 */
export async function getClients() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = (session.user as any).entityId

  // Check module access
  await requireModule(entityId, 'clients')

  // Check permission
  const canRead = await hasPermission(userId, 'clients', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view clients')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch clients scoped to accessible entities
  const clients = await prisma.client.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return clients
}

/**
 * Get a single client by ID
 */
export async function getClient(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'clients', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view clients')
  }

  // Get the client
  const client = await prisma.client.findUnique({
    where: { id },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  // Verify user can access this client's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(client.entityId)) {
    throw new Error('You do not have permission to access this client')
  }

  return client
}

/**
 * Create a new client
 */
export async function createClient(data: {
  name: string
  companyName?: string
  email: string
  phone?: string
  address?: string
  billingAddress?: string
  vatNumber?: string
  vatRegistered?: boolean
  cisRegistered?: boolean
  paymentTerms?: number
  referenceCode?: string
  ratesConfig?: any
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const userId = session.user.id as string

    // Check permission
    const canCreate = await hasPermission(userId, 'clients', 'create')
    if (!canCreate) {
      return { success: false, error: 'You do not have permission to create clients' }
    }

    // Get user's entity
    const userEntity = await getUserEntity(userId)
    if (!userEntity) {
      return { success: false, error: 'User entity not found' }
    }

  // Auto-generate reference code if not provided, or validate if provided
  let referenceCode = data.referenceCode?.toUpperCase().trim()
  if (!referenceCode) {
    // Auto-generate 2 letters + number (e.g., CC1, BS12)
    const basePrefix = generateReferenceCode(data.name, data.companyName)
    
    // Find the next available number for this prefix
    let number = 1
    let finalCode = `${basePrefix}${number}`
    
    while (true) {
      const existing = await prisma.client.findFirst({
        where: {
          entityId: userEntity.entityId,
          referenceCode: finalCode,
        },
      })
      
      if (!existing) {
        break
      }
      
      // Try next number
      number++
      finalCode = `${basePrefix}${number}`
      
      // Safety limit
      if (number > 9999) {
        return { success: false, error: 'Unable to generate unique reference code. Please specify one manually.' }
      }
    }
    referenceCode = finalCode
  } else {
    // Validate format: 2 uppercase letters followed by at least one number
    if (!/^[A-Z]{2}\d+$/.test(referenceCode)) {
      return { success: false, error: 'Reference code must be 2 uppercase letters followed by a number (e.g., CC1, BS12, CC2)' }
    }
    
    // Check if provided reference code is unique
    const existing = await prisma.client.findFirst({
      where: {
        entityId: userEntity.entityId,
        referenceCode: referenceCode,
      },
    })
    
    if (existing) {
      return { success: false, error: 'Reference code already exists for another client in this entity' }
    }
  }

    // Create client scoped to user's entity
    const client = await prisma.client.create({
      data: {
        entityId: userEntity.entityId,
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        billingAddress: data.billingAddress,
        vatNumber: data.vatNumber,
        vatRegistered: data.vatRegistered ?? false,
        cisRegistered: data.cisRegistered ?? false,
        paymentTerms: data.paymentTerms ?? 30,
        referenceCode: referenceCode,
        ratesConfig: data.ratesConfig,
        notes: data.notes,
      },
    })

    // Create InvoiceCode record with full reference code as prefix
    await prisma.invoiceCode.create({
      data: {
        entityId: userEntity.entityId,
        clientId: client.id,
        prefix: referenceCode, // Use full reference code (e.g., CC1, BS12)
        lastNumber: 0,
      },
    })

    revalidatePath('/clients')
    return { success: true, data: client }
  } catch (error) {
    // Catch any unexpected errors and return them
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Update an existing client
 */
export async function updateClient(
  id: string,
  data: {
    name?: string
    companyName?: string
    email?: string
    phone?: string
    address?: string
    billingAddress?: string
    vatNumber?: string
    vatRegistered?: boolean
    cisRegistered?: boolean
    paymentTerms?: number
    referenceCode?: string
    ratesConfig?: any
    notes?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const userId = session.user.id as string

    // Check permission
    const canUpdate = await hasPermission(userId, 'clients', 'update')
    if (!canUpdate) {
      return { success: false, error: 'You do not have permission to update clients' }
    }

    // Get the existing client
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return { success: false, error: 'Client not found' }
    }

    // Verify user can access this client's entity
    const entityIds = await getAccessibleEntityIds(userId)
    if (!entityIds.includes(existingClient.entityId)) {
      return { success: false, error: 'You do not have permission to update this client' }
    }

    // Validate reference code format and uniqueness if being changed
    let validatedReferenceCode = existingClient.referenceCode
    if (data.referenceCode) {
      validatedReferenceCode = data.referenceCode.toUpperCase().trim()
      
      // Validate format: 2 uppercase letters followed by at least one number
      if (!/^[A-Z]{2}\d+$/.test(validatedReferenceCode)) {
        return { success: false, error: 'Reference code must be 2 uppercase letters followed by a number (e.g., CC1, BS12, CC2)' }
      }
      
      // Only check uniqueness if it's different from current
      if (validatedReferenceCode !== existingClient.referenceCode) {
        const existing = await prisma.client.findFirst({
          where: {
            entityId: existingClient.entityId,
            referenceCode: validatedReferenceCode,
            id: { not: id },
          },
        })
        
        if (existing) {
          return { success: false, error: 'Reference code already exists for another client in this entity' }
        }
      }
    }

    // Update client
    const client = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        billingAddress: data.billingAddress,
        vatNumber: data.vatNumber,
        vatRegistered: data.vatRegistered,
        cisRegistered: data.cisRegistered,
        paymentTerms: data.paymentTerms,
        referenceCode: validatedReferenceCode,
        ratesConfig: data.ratesConfig,
        notes: data.notes,
      },
    })

    // If reference code changed, update the InvoiceCode record prefix
    // Note: We don't reset lastNumber - invoices already generated should keep their numbers
    if (validatedReferenceCode && validatedReferenceCode !== existingClient.referenceCode) {
      const refCode = validatedReferenceCode.toUpperCase()
      const match = refCode.match(/^([A-Z]{2})\d+$/)
      if (match) {
        const prefix = refCode // Use full reference code as prefix
        
        // Update or create InvoiceCode record (only update prefix, keep lastNumber)
        await prisma.invoiceCode.upsert({
          where: {
            entityId_clientId: {
              entityId: existingClient.entityId,
              clientId: id,
            },
          },
          update: {
            prefix: prefix,
            // Don't reset lastNumber - keep existing invoice numbering
          },
          create: {
            entityId: existingClient.entityId,
            clientId: id,
            prefix: prefix,
            lastNumber: 0,
          },
        })
      }
    }

    revalidatePath('/clients')
    revalidatePath(`/clients/${id}`)
    return { success: true, data: client }
  } catch (error) {
    // Catch any unexpected errors and return them
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: errorMessage }
  }
}

/**
 * Delete a client
 */
export async function deleteClient(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'clients', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete clients')
  }

  // Get the existing client
  const existingClient = await prisma.client.findUnique({
    where: { id },
  })

  if (!existingClient) {
    throw new Error('Client not found')
  }

  // Verify user can access this client's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingClient.entityId)) {
    throw new Error('You do not have permission to delete this client')
  }

  // Delete client
  await prisma.client.delete({
    where: { id },
  })

  revalidatePath('/clients')
}
