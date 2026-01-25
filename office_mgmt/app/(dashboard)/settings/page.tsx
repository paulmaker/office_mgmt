'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Save, Building2, Users, Bell, Database, Mail, Loader2, Lock } from 'lucide-react'
import { getSettings, updateSettings, type SettingsFormData } from '@/app/actions/settings'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { MODULES, getAllModuleKeys, type ModuleKey } from '@/lib/module-access'
import { useSession } from 'next-auth/react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { data: session } = useSession()
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<SettingsFormData>()
  const enabledModules = watch('enabledModules') || getAllModuleKeys()
  
  // Check if user is admin
  const userRole = (session?.user as any)?.role
  const isAdmin = ['PLATFORM_ADMIN', 'ACCOUNT_ADMIN', 'ENTITY_ADMIN'].includes(userRole || '')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      reset(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true)
    try {
      await updateSettings(data)
      toast({
        variant: 'success',
        title: 'Settings saved',
        description: 'Your changes have been saved successfully.'
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to save settings'
      })
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your account and application preferences
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>Update your business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...register('companyName')} placeholder="Your Company Ltd" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyRegistration">Company Registration</Label>
              <Input id="companyRegistration" {...register('companyRegistration')} placeholder="12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input id="vatNumber" {...register('vatNumber')} placeholder="GB123456789" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input id="address" {...register('address')} placeholder="123 Main Street, London" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register('phone')} placeholder="020 1234 5678" />
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>Configure email settings for timesheets and invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailTimesheets">Timesheet Email</Label>
              <Input
                id="emailTimesheets"
                type="email"
                {...register('emailTimesheets')}
                placeholder="timesheets@yourcompany.com"
              />
              <p className="text-xs text-gray-500">
                Subcontractors send timesheets to this address
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailInvoices">Invoice From Email</Label>
              <Input
                id="emailInvoices"
                type="email"
                {...register('emailInvoices')}
                placeholder="invoices@yourcompany.com"
              />
              <p className="text-xs text-gray-500">
                Invoices will be sent from this address
              </p>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
                <span className="text-sm font-medium">Email Connected</span>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure when you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Invoice Overdue</p>
                <p className="text-sm text-gray-500">Get notified when invoices become overdue</p>
              </div>
              <input type="checkbox" className="h-4 w-4" {...register('notifyInvoiceOverdue')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Timesheet Submissions</p>
                <p className="text-sm text-gray-500">Notify on new timesheet submissions</p>
              </div>
              <input type="checkbox" className="h-4 w-4" {...register('notifyTimesheetSubmission')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Vehicle Reminders</p>
                <p className="text-sm text-gray-500">MOT, tax, and insurance due dates</p>
              </div>
              <input type="checkbox" className="h-4 w-4" {...register('notifyVehicleReminders')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">CIS Return Reminder</p>
                <p className="text-sm text-gray-500">Monthly CIS return deadline</p>
              </div>
              <input type="checkbox" className="h-4 w-4" {...register('notifyCisReturn')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">VAT Return Reminder</p>
                <p className="text-sm text-gray-500">Quarterly VAT return deadline</p>
              </div>
              <input type="checkbox" className="h-4 w-4" {...register('notifyVatReturn')} />
            </div>
          </CardContent>
        </Card>

        {/* CIS Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              CIS Configuration
            </CardTitle>
            <CardDescription>Configure CIS deduction rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Verified Net Rate (%)</Label>
              <Input type="number" {...register('cisVerifiedNetRate')} />
            </div>
            <div className="space-y-2">
              <Label>Not Verified Rate (%)</Label>
              <Input type="number" {...register('cisNotVerifiedRate')} />
            </div>
            <div className="space-y-2">
              <Label>Verified Gross Rate (%)</Label>
              <Input type="number" {...register('cisVerifiedGrossRate')} />
            </div>
          </CardContent>
        </Card>

        {/* VAT Settings */}
        <Card>
          <CardHeader>
            <CardTitle>VAT Configuration</CardTitle>
            <CardDescription>Configure VAT rates and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Standard VAT Rate (%)</Label>
              <Input type="number" {...register('vatStandardRate')} />
            </div>
            <div className="space-y-2">
              <Label>Reduced VAT Rate (%)</Label>
              <Input type="number" {...register('vatReducedRate')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">VAT Registered</p>
                <p className="text-sm text-gray-500">Is your company VAT registered?</p>
              </div>
              <input type="checkbox" className="h-4 w-4" {...register('isVatRegistered')} />
            </div>
          </CardContent>
        </Card>

        {/* Module Access */}
        {isAdmin && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Module Access
              </CardTitle>
              <CardDescription>
                Control which modules are available to users in your organization. Disabled modules will be hidden from the navigation menu.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
              <input type="hidden" {...register('enabledModules')} />
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  )
}
