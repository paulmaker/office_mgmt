'use server'

import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

const ENTITY_SELECTION_COOKIE = 'entity_selection_done'

/**
 * Mark that the user has completed entity selection (so we don't redirect again).
 */
export async function setEntitySelectionDone() {
  const cookieStore = await cookies()
  cookieStore.set(ENTITY_SELECTION_COOKIE, '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
  })
}

/**
 * Clear entity selection cookie (e.g. when landing on login so next login shows picker again).
 */
export async function clearEntitySelectionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(ENTITY_SELECTION_COOKIE)
}

/**
 * Get list of entities the current user can access (for entity picker at login).
 */
export async function getAccessibleEntities(): Promise<{ id: string; name: string }[]> {
  const session = await auth()
  if (!session?.user?.id) {
    return []
  }

  const entityIds = await getAccessibleEntityIds(session.user.id as string)
  if (entityIds.length === 0) return []

  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return entities
}
