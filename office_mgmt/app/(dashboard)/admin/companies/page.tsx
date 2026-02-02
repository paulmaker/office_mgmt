'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, CheckCircle, XCircle, Settings, Loader2, X } from 'lucide-react'
import { createEntity, getEntities, updateEntity, getEntitySettings, updateEntityModules } from '@/app/actions/admin/entities'
import { getTenantAccounts } from '@/app/actions/admin/tenant-accounts'
import { formatDate } from '@/lib/utils'
import { MODULES, getAllModuleKeys, type ModuleKey } from '@/lib/module-access'

export default function CompaniesPage() {
  const { data: session } = useSession()
  const isPlatformAdmin = (session?.user as any)?.role === 'PLATFORM_ADMIN'
  const [companies, setCompanies] = useState<any[]>([])
  const [organisations, setOrganisations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({
    tenantAccountId: '',
    name: '',
    slug: '',
  })
  
  // Module Access state
  const [showModules, setShowModules] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>(getAllModuleKeys())
  const [modulesLoading, setModulesLoading] = useState(false)
  const [modulesSaving, setModulesSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [companiesData, orgsData] = await Promise.all([
        getEntities(),
        getTenantAccounts().catch(() => []), // May fail if not Platform Admin
      ])
      setCompanies(companiesData)
      setOrganisations(orgsData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      alert(error.message || 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await updateEntity(editing.id, {
          name: formData.name,
          slug: formData.slug,
        })
      } else {
        await createEntity(formData)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({ tenantAccountId: '', name: '', slug: '' })
      loadData()
    } catch (error: any) {
      alert(error.message || 'Failed to save company')
    }
  }

  const handleEdit = (company: any) => {
    setEditing(company)
    setFormData({
      tenantAccountId: company.tenantAccountId,
      name: company.name,
      slug: company.slug,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditing(null)
    setFormData({ tenantAccountId: '', name: '', slug: '' })
  }

  // Module Access handlers
  const handleOpenModules = async (company: any) => {
    setSelectedCompany(company)
    setShowModules(true)
    setModulesLoading(true)
    try {
      const settings = await getEntitySettings(company.id)
      setEnabledModules(settings.enabledModules as ModuleKey[])
    } catch (error: any) {
      alert(error.message || 'Failed to load module settings')
      setShowModules(false)
    } finally {
      setModulesLoading(false)
    }
  }

  const handleCloseModules = () => {
    setShowModules(false)
    setSelectedCompany(null)
    setEnabledModules(getAllModuleKeys())
  }

  const toggleModule = (moduleKey: ModuleKey) => {
    if (enabledModules.includes(moduleKey)) {
      setEnabledModules(enabledModules.filter(m => m !== moduleKey))
    } else {
      setEnabledModules([...enabledModules, moduleKey])
    }
  }

  const handleSaveModules = async () => {
    if (!selectedCompany) return
    setModulesSaving(true)
    try {
      await updateEntityModules(selectedCompany.id, enabledModules)
      alert('Module settings saved successfully')
      handleCloseModules()
    } catch (error: any) {
      alert(error.message || 'Failed to save module settings')
    } finally {
      setModulesSaving(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-gray-500 mt-1">
            Manage entities within organisations
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Module Access Configuration */}
      {showModules && selectedCompany && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Module Access: {selectedCompany.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  Control which modules are available for this company. Disabled modules will be hidden from users.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseModules}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                  {/* People & Contacts */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-gray-700">People & Contacts</h3>
                    <div className="space-y-3">
                      {(['clients', 'subcontractors', 'employees', 'suppliers'] as ModuleKey[]).map((moduleKey) => (
                        <div key={moduleKey} className="flex items-center justify-between">
                          <p className="font-medium text-sm">{MODULES[moduleKey].name}</p>
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
                          <p className="font-medium text-sm">{MODULES[moduleKey].name}</p>
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
                          <p className="font-medium text-sm">{MODULES[moduleKey].name}</p>
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
                <div className="flex gap-2">
                  <Button onClick={handleSaveModules} disabled={modulesSaving}>
                    {modulesSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {modulesSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseModules}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit Company' : 'New Company'}</CardTitle>
            <CardDescription>
              {editing ? 'Update company details' : 'Create a new company'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && organisations.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="tenantAccountId">Organisation</Label>
                  <select
                    id="tenantAccountId"
                    value={formData.tenantAccountId}
                    onChange={(e) => setFormData({ ...formData, tenantAccountId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select an organisation</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: editing ? formData.slug : generateSlug(e.target.value),
                    })
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL-friendly identifier)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens"
                />
                <p className="text-xs text-gray-500">
                  Used in URLs. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            {companies.length} compan{companies.length !== 1 ? 'ies' : 'y'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : companies.length === 0 ? (
            <p className="text-gray-500">No companies found. Create your first one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.tenantAccount.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{company.slug}</code>
                    </TableCell>
                    <TableCell>{company._count.users}</TableCell>
                    <TableCell>
                      {company.isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(company.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isPlatformAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModules(company)}
                            title="Configure Modules"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(company)}
                          title="Edit Company"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
