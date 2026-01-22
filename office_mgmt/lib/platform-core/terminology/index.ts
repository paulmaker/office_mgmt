/**
 * Platform Core: Terminology Translation
 * 
 * Translates internal terminology (Account/Entity) to external terminology
 * (Organisation/Company) for UI display.
 * Can be customized per TenantAccount via settings.
 */

export type TerminologyConfig = {
  account: {
    internal: string
    external: string
  }
  entity: {
    internal: string
    external: string
  }
}

/**
 * Default terminology
 */
export const DEFAULT_TERMINOLOGY: TerminologyConfig = {
  account: {
    internal: 'TenantAccount',
    external: 'Organisation',
  },
  entity: {
    internal: 'Entity',
    external: 'Company',
  },
}

/**
 * Get terminology for a tenant account
 * Falls back to default if not configured
 */
export async function getTerminology(
  tenantAccountId?: string
): Promise<TerminologyConfig> {
  if (!tenantAccountId) {
    return DEFAULT_TERMINOLOGY
  }

  // TODO: Load from TenantAccount.settings when implemented
  // For now, return default
  return DEFAULT_TERMINOLOGY
}

/**
 * Translate internal term to external term
 */
export function translateTerm(
  term: 'account' | 'entity',
  terminology: TerminologyConfig = DEFAULT_TERMINOLOGY
): string {
  return terminology[term].external
}

/**
 * Get account display name
 */
export function getAccountDisplayName(
  terminology: TerminologyConfig = DEFAULT_TERMINOLOGY
): string {
  return terminology.account.external
}

/**
 * Get entity display name
 */
export function getEntityDisplayName(
  terminology: TerminologyConfig = DEFAULT_TERMINOLOGY
): string {
  return terminology.entity.external
}
