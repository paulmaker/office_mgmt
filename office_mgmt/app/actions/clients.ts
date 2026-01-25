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
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'clients', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create clients')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Auto-generate reference code if not provided
  let referenceCode = data.referenceCode
  if (!referenceCode) {
    const baseCode = generateReferenceCode(data.name, data.companyName)
    
    // Always append a 6-digit number, starting from 000001
    // Find the highest number for this base code in this entity
    const existingCodes = await prisma.client.findMany({
      where: {
        entityId: userEntity.entityId,
        referenceCode: {
          startsWith: baseCode,
        },
      },
      select: {
        referenceCode: true,
      },
    })
    
    // Extract numbers from existing codes (e.g., "CC000001" -> 1, "CC000002" -> 2)
    const numbers = existingCodes
      .map(c => {
        // Match base code followed by 6 digits
        const match = c.referenceCode?.match(new RegExp(`^${baseCode}(\\d{6})$`))
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(n => n > 0)
    
    // Get next number (highest + 1, or 1 if none exist)
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    // Pad to 6 digits
    const paddedNumber = nextNumber.toString().padStart(6, '0')
    referenceCode = `${baseCode}${paddedNumber}`
  } else {
    // Check if provided reference code is unique
    const existing = await prisma.client.findFirst({
      where: {
        entityId: userEntity.entityId,
        referenceCode: data.referenceCode,
      },
    })
    
    if (existing) {
      throw new Error('Reference code already exists for another client in this entity')
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

  revalidatePath('/clients')
  return client
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
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'clients', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update clients')
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
    throw new Error('You do not have permission to update this client')
  }

  // Validate reference code uniqueness if being changed
  if (data.referenceCode && data.referenceCode !== existingClient.referenceCode) {
    const existing = await prisma.client.findFirst({
      where: {
        entityId: existingClient.entityId,
        referenceCode: data.referenceCode,
        id: { not: id },
      },
    })
    
    if (existing) {
      throw new Error('Reference code already exists for another client in this entity')
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
      referenceCode: data.referenceCode,
      ratesConfig: data.ratesConfig,
      notes: data.notes,
    },
  })

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return client
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
