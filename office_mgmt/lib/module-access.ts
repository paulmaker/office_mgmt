import { prisma } from "@/lib/prisma"

// Define module keys and metadata
export const MODULES = {
  clients: { name: 'Clients', default: true },
  subcontractors: { name: 'Subcontractors', default: true },
  employees: { name: 'Employees', default: true },
  suppliers: { name: 'Suppliers', default: true },
  jobs: { name: 'Jobs', default: true },
  jobPrices: { name: 'Job Prices', default: true },
  invoices: { name: 'Invoices', default: true },
  timesheets: { name: 'Timesheets', default: true },
  payroll: { name: 'CIS Payroll', default: true },
  banking: { name: 'Bank Reconciliation', default: true },
  reports: { name: 'Reports', default: true },
  assets: { name: 'Assets', default: true },
  quickLinks: { name: 'Quick Links', default: true },
} as const

export type ModuleKey = keyof typeof MODULES

// Route to module mapping
export const ROUTE_TO_MODULE: Record<string, ModuleKey> = {
  '/clients': 'clients',
  '/subcontractors': 'subcontractors',
  '/employees': 'employees',
  '/suppliers': 'suppliers',
  '/jobs': 'jobs',
  '/job-prices': 'jobPrices',
  '/invoices': 'invoices',
  '/timesheets': 'timesheets',
  '/payroll': 'payroll',
  '/banking': 'banking',
  '/reports': 'reports',
  '/assets': 'assets',
  '/quick-links': 'quickLinks',
}

/**
 * Get all enabled modules for an entity
 * Returns a Set of enabled module keys
 * If enabledModules is not set in settings, returns all modules (backward compatible)
 */
export async function getEnabledModules(entityId: string): Promise<Set<ModuleKey>> {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { settings: true }
  })

  if (!entity) {
    throw new Error("Entity not found")
  }

  const settings = entity.settings as { enabledModules?: ModuleKey[] } | null

  // If enabledModules is not set, return all modules (backward compatible)
  if (!settings?.enabledModules || settings.enabledModules.length === 0) {
    return new Set(Object.keys(MODULES) as ModuleKey[])
  }

  return new Set(settings.enabledModules)
}

/**
 * Check if a specific module is enabled for an entity
 */
export async function isModuleEnabled(entityId: string, module: ModuleKey): Promise<boolean> {
  const enabledModules = await getEnabledModules(entityId)
  return enabledModules.has(module)
}

/**
 * Require a module to be enabled, throw error if not
 * Use this in server actions to enforce module access
 */
export async function requireModule(entityId: string, module: ModuleKey): Promise<void> {
  const enabled = await isModuleEnabled(entityId, module)
  if (!enabled) {
    throw new Error(`Module "${MODULES[module].name}" is not enabled for this organization`)
  }
}

/**
 * Get all module keys (for UI rendering)
 */
export function getAllModuleKeys(): ModuleKey[] {
  return Object.keys(MODULES) as ModuleKey[]
}
