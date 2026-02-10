'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Banknote,
  CreditCard,
  BarChart3,
  Truck,
  Settings,
  Link2,
  ClipboardList,
  Shield,
  LogOut,
  Briefcase,
  UserCheck,
  Package,
  DollarSign,
  Building2,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: null }, // Core module, always visible
  { name: 'Clients', href: '/clients', icon: Users, module: 'clients' as const },
  { name: 'Subcontractors', href: '/subcontractors', icon: Briefcase, module: 'subcontractors' as const },
  { name: 'Employees', href: '/employees', icon: UserCheck, module: 'employees' as const },
  { name: 'Suppliers', href: '/suppliers', icon: Package, module: 'suppliers' as const },
  { name: 'Jobs', href: '/jobs', icon: ClipboardList, module: 'jobs' as const },
  { name: 'Job Prices', href: '/job-prices', icon: DollarSign, module: 'jobPrices' as const },
  { name: 'Invoices', href: '/invoices', icon: FileText, module: 'invoices' as const },
  { name: 'Timesheets', href: '/timesheets', icon: Clock, module: 'timesheets' as const },
  { name: 'CIS Payroll', href: '/payroll', icon: Banknote, module: 'payroll' as const },
  { name: 'Bank Reconciliation', href: '/banking', icon: CreditCard, module: 'banking' as const },
  { name: 'Reports', href: '/reports', icon: BarChart3, module: 'reports' as const },
  { name: 'Assets', href: '/assets', icon: Truck, module: 'assets' as const },
  { name: 'Quick Links', href: '/quick-links', icon: Link2, module: 'quickLinks' as const },
  { name: 'Admin', href: '/admin', icon: Shield, adminOnly: true, module: null }, // Core module, always visible
  { name: 'Settings', href: '/settings', icon: Settings, module: null }, // Core module, always visible
]

export function Sidebar({ hasMultipleEntities = false }: { hasMultipleEntities?: boolean }) {
  const pathname = usePathname()
  const { data: session } = useSession() as { data: Session | null }
  const user = session?.user
  const userRole = user?.role
  const enabledModules = user?.enabledModules ?? []
  const organizationName = user?.organizationName ?? 'Office Manager'
  const entityName = user?.entityName

  return (
    <div className="flex h-full w-64 flex-col overflow-hidden bg-gray-900">
      <div className="flex h-16 shrink-0 items-center px-6">
        <h1 className="text-xl font-bold text-white">{organizationName}</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {hasMultipleEntities && (
          <div className="px-3 pb-2">
            <Link
              href="/auth/choose-entity"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/auth/choose-entity'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Building2 className="h-5 w-5" />
              <span className="flex flex-col items-start">
                <span>Switch entity</span>
                {entityName && <span className="text-xs text-gray-500 font-normal">{entityName}</span>}
              </span>
            </Link>
          </div>
        )}
        <nav className="space-y-1 px-3 py-4">
        {navigation.map((item) => {
          // Hide admin link if user doesn't have admin role
          const adminRoles: string[] = ['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN']
          if (item.adminOnly && (!userRole || !adminRoles.includes(userRole))) {
            return null
          }

          // Hide module if it's not enabled (unless it's a core module with module: null)
          if (item.module && !enabledModules.includes(item.module)) {
            return null
          }

          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
        </nav>
      </div>
      <div className="shrink-0 border-t border-gray-800 p-4">
        <div className="text-xs text-gray-400 mb-3">
          <p className="font-medium text-white">
            {session?.user?.name || 'User'}
          </p>
          <p className="mt-1 text-gray-500">{session?.user?.email}</p>
          {userRole && (
            <p className="mt-1 text-gray-400">
              Role: {userRole.replace('_', ' ')}
            </p>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login' })}
          className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
