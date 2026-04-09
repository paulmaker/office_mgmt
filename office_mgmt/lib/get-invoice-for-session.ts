import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/platform-core/rbac'
import { requireSessionEntityId } from '@/lib/session-entity'
import { requireModule } from '@/lib/module-access'

/**
 * Load one invoice with the same auth rules as the invoices list (module + read permission + entity scope).
 * Used by the server action and by GET /api/invoices/[id] so edit flows do not rely on server-action IDs from stale client bundles.
 */
export async function getInvoiceForSession(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = requireSessionEntityId(session)

  await requireModule(entityId, 'invoices')

  const canRead = await hasPermission(userId, 'invoices', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view invoices')
  }

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

  if (invoice.entityId !== entityId) {
    throw new Error('You do not have permission to access this invoice')
  }

  return {
    ...invoice,
    outstandingAmount: invoice.total - invoice.paidAmount,
  }
}
