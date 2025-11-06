'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Timesheets', href: '/timesheets', icon: Clock },
  { name: 'CIS Payroll', href: '/payroll', icon: Banknote },
  { name: 'Bank Reconciliation', href: '/banking', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Assets', href: '/assets', icon: Truck },
  { name: 'Quick Links', href: '/quick-links', icon: Link2 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Office Manager</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
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
      <div className="border-t border-gray-800 p-4">
        <div className="text-xs text-gray-400">
          <p>Logged in as Admin</p>
          <p className="mt-1 text-gray-500">admin@example.com</p>
        </div>
      </div>
    </div>
  )
}
