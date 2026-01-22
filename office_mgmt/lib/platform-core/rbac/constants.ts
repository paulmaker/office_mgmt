/**
 * Platform Core: RBAC Constants
 * 
 * Permission constants and default role permissions.
 */

import type { PermissionCheck } from './types'

/**
 * All available resources
 */
export const RESOURCES = [
  'clients',
  'invoices',
  'timesheets',
  'subcontractors',
  'bank_transactions',
  'assets',
  'jobs',
  'employees',
  'vat_returns',
  'cis_returns',
  'quick_links',
] as const

/**
 * All available actions
 */
export const ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'export',
] as const

/**
 * All available modules
 */
export const MODULES = [
  'dashboard',
  'clients',
  'invoices',
  'timesheets',
  'jobs',
  'banking',
  'payroll',
  'reports',
  'assets',
  'settings',
  'quick_links',
] as const

/**
 * Default ENTITY_USER permissions (Read + Create)
 */
export const ENTITY_USER_PERMISSIONS: PermissionCheck[] = [
  // Clients
  { resource: 'clients', action: 'read' },
  { resource: 'clients', action: 'create' },
  { resource: 'clients', action: 'update' },
  // Invoices
  { resource: 'invoices', action: 'read' },
  { resource: 'invoices', action: 'create' },
  // Timesheets
  { resource: 'timesheets', action: 'read' },
  { resource: 'timesheets', action: 'create' },
  // Jobs
  { resource: 'jobs', action: 'read' },
  { resource: 'jobs', action: 'create' },
  { resource: 'jobs', action: 'update' },
  // Subcontractors
  { resource: 'subcontractors', action: 'read' },
  { resource: 'subcontractors', action: 'create' },
  // Employees
  { resource: 'employees', action: 'read' },
  { resource: 'employees', action: 'create' },
  // Assets (read-only)
  { resource: 'assets', action: 'read' },
  // Bank Transactions (read-only)
  { resource: 'bank_transactions', action: 'read' },
  // Modules
  { module: 'dashboard' },
  { module: 'clients' },
  { module: 'invoices' },
  { module: 'timesheets' },
  { module: 'jobs' },
]
