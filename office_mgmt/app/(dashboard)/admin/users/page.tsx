'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Users, Edit, CheckCircle, XCircle } from 'lucide-react'
import { createUser, getUsers, updateUser } from '@/app/actions/admin/users'
import { getEntities } from '@/app/actions/admin/entities'
import { formatDate } from '@/lib/utils'
import type { Role } from '@/lib/platform-core/rbac/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'PLATFORM_ADMIN', label: 'Platform Admin' },
  { value: 'ACCOUNT_ADMIN', label: 'Account Admin' },
  { value: 'ENTITY_ADMIN', label: 'Entity Admin' },
  { value: 'ENTITY_USER', label: 'Entity User' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    entityId: '',
    role: 'ENTITY_USER' as Role,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, entitiesData] = await Promise.all([
        getUsers(),
        getEntities(),
      ])
      setUsers(usersData)
      setEntities(entitiesData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      alert(error.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await updateUser(editing.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          entityId: formData.entityId,
        })
      } else {
        await createUser(formData)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({ email: '', name: '', entityId: '', role: 'ENTITY_USER' })
      loadData()
    } catch (error: any) {
      alert(error.message || 'Failed to save user')
    }
  }

  const handleEdit = (user: any) => {
    setEditing(user)
    setFormData({
      email: user.email,
      name: user.name || '',
      entityId: user.entityId,
      role: user.role,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditing(null)
    setFormData({ email: '', name: '', entityId: '', role: 'ENTITY_USER' })
  }

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return 'default'
      case 'ACCOUNT_ADMIN':
        return 'default'
      case 'ENTITY_ADMIN':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-gray-500 mt-1">
            Manage user accounts and roles
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit User' : 'New User'}</CardTitle>
            <CardDescription>
              {editing ? 'Update user details' : 'Create a new user account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editing}
                />
                {editing && (
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entityId">Company</Label>
                <select
                  id="entityId"
                  value={formData.entityId}
                  onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a company</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} ({entity.tenantAccount.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Platform Admin: Full system access
                  <br />
                  Account Admin: Manage all companies in organisation
                  <br />
                  Entity Admin: Manage users and data in company
                  <br />
                  Entity User: Standard user with read/create permissions
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
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500">No users found. Create your first one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.entity.name}</TableCell>
                    <TableCell>{user.entity.tenantAccount.name}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {ROLES.find((r) => r.value === user.role)?.label || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
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
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
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
