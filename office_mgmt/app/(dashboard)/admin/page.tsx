'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, Briefcase, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getSettings, updateSettings, type SettingsFormData } from '@/app/actions/settings'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { MODULES, getAllModuleKeys, type ModuleKey } from '@/lib/module-access'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [moduleLoading, setModuleLoading] = useState(true)
  const [moduleSaving, setModuleSaving] = useState(false)
  const { toast } = useToast()
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<SettingsFormData>()
  const enabledModules = watch('enabledModules') || getAllModuleKeys()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    const role = (session.user as any)?.role
    if (!['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(role)) {
      router.push('/dashboard')
    } else {
      // Load module settings
      loadModuleSettings()
    }
  }, [session, status, router])

  const loadModuleSettings = async () => {
    try {
      const data = await getSettings()
      reset(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load module settings'
      })
    } finally {
      setModuleLoading(false)
    }
  }

  const onModuleSubmit = async (data: SettingsFormData) => {
    setModuleSaving(true)
    try {
      await updateSettings(data)
      toast({
        variant: 'success',
        title: 'Module settings saved',
        description: 'Your changes have been saved successfully.'
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to save module settings'
      })
    } finally {
      setModuleSaving(false)
    }
  }

  const toggleModule = (moduleKey: ModuleKey) => {
    const current = enabledModules || []
    if (current.includes(moduleKey)) {
      setValue('enabledModules', current.filter(m => m !== moduleKey))
    } else {
      setValue('enabledModules', [...current, moduleKey])
    }
  }

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

      {/* Module Access */}
      <form onSubmit={handleSubmit(onModuleSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Module Access
                </CardTitle>
                <CardDescription className="mt-1">
                  Control which modules are available to users in your organization. Disabled modules will be hidden from the navigation menu.
                </CardDescription>
              </div>
              <Button type="submit" disabled={moduleSaving || moduleLoading}>
                {moduleSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {moduleSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {moduleLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* People & Contacts */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-gray-700">People & Contacts</h3>
                  <div className="space-y-3">
                    {(['clients', 'subcontractors', 'employees', 'suppliers'] as ModuleKey[]).map((moduleKey) => (
                      <div key={moduleKey} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{MODULES[moduleKey].name}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={enabledModules.includes(moduleKey)}
                          onChange={() => toggleModule(moduleKey)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operations */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-gray-700">Operations</h3>
                  <div className="space-y-3">
                    {(['jobs', 'jobPrices', 'invoices', 'timesheets'] as ModuleKey[]).map((moduleKey) => (
                      <div key={moduleKey} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{MODULES[moduleKey].name}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={enabledModules.includes(moduleKey)}
                          onChange={() => toggleModule(moduleKey)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial & Tools */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-gray-700">Financial & Tools</h3>
                  <div className="space-y-3">
                    {(['payroll', 'banking', 'reports', 'assets', 'quickLinks'] as ModuleKey[]).map((moduleKey) => (
                      <div key={moduleKey} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{MODULES[moduleKey].name}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={enabledModules.includes(moduleKey)}
                          onChange={() => toggleModule(moduleKey)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <input type="hidden" {...register('enabledModules')} />
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
