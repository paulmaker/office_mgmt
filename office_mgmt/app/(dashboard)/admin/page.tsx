'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, Briefcase } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    const role = (session.user as any)?.role
    if (!['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(role)) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading' || !session) {
    return <div className="p-6">Loading...</div>
  }

  const role = (session.user as any)?.role
  if (!['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(role)) {
    return null
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-gray-500 mt-1">
          Manage organisations, companies, and users
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* TenantAccounts Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisations
            </CardTitle>
            <CardDescription>
              Manage tenant accounts (Platform Admin only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Create and manage organisations. Each organisation can have multiple companies.
            </p>
            <Link href="/admin/organisations">
              <Button className="w-full">
                Manage Organisations
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Entities Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Companies
            </CardTitle>
            <CardDescription>
              Manage entities within organisations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Create and manage companies. Each company has its own data and users.
            </p>
            <Link href="/admin/companies">
              <Button className="w-full">
                Manage Companies
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Users Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>
              Manage user accounts and roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Create users, assign roles, and manage permissions.
            </p>
            <Link href="/admin/users">
              <Button className="w-full">
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
