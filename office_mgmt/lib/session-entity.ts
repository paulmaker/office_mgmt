import type { Session } from 'next-auth'

/**
 * Get the current session's entity ID.
 * Users work in a single entity at a time (chosen at login for multi-entity users).
 * Returns null if no entity is set (user must choose entity).
 */
export function getSessionEntityId(session: Session | null): string | null {
  if (!session?.user) return null
  return (session.user as { entityId?: string }).entityId ?? null
}

/**
 * Require the session's entity ID. Throws if not set.
 * Use in server actions and API routes that need to scope data to the current entity.
 */
export function requireSessionEntityId(session: Session | null): string {
  const entityId = getSessionEntityId(session)
  if (!entityId) {
    throw new Error('No entity selected. Please choose an entity.')
  }
  return entityId
}
