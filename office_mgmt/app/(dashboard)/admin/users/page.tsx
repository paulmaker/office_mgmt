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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Users, Edit, CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react'
import { createUser, getUsers, updateUser, resendInvite } from '@/app/actions/admin/users'
import { getEntities } from '@/app/actions/admin/entities'
import { formatDate } from '@/lib/utils'
import type { Role } from '@/lib/platform-core/rbac/types'
import { useToast } from '@/hooks/use-toast'

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const { toast } = useToast()
  
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to load users'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!formData.email.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Email is required"
      })
      return
    }
    
    if (!editing && !formData.entityId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a company"
      })
      return
    }
    
    setSubmitting(true)
    try {
      if (editing) {
        await updateUser(editing.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          entityId: formData.entityId,
        })
        toast({
            variant: "success",
            title: "User updated",
            description: "User details have been updated successfully."
        })
      } else {
        const result = await createUser(formData)
        if (result.emailSent) {
          toast({
              variant: "success",
              title: "Invitation Sent",
              description: `An invite email has been sent to ${formData.email}.`
          })
        } else {
          toast({
              variant: "default",
              title: "User Created",
              description: `User created but invite email could not be sent. They can use the forgot password feature to set up their account.`
          })
        }
      }
      setIsDialogOpen(false)
      setEditing(null)
      setFormData({ email: '', name: '', entityId: '', role: 'ENTITY_USER' })
      loadData()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to save user'
      })
    } finally {
        setSubmitting(false)
    }
  }

  const handleCreateClick = () => {
      setEditing(null)
      setFormData({ email: '', name: '', entityId: '', role: 'ENTITY_USER' })
      setIsDialogOpen(true)
  }

  const handleEdit = (user: any) => {
    setEditing(user)
    setFormData({
      email: user.email,
      name: user.name || '',
      entityId: user.entityId,
      role: user.role,
    })
    setIsDialogOpen(true)
  }

  const handleResendInvite = async (user: any) => {
    try {
      setResendingId(user.id)
      await resendInvite(user.id)
      toast({
        title: 'Invite sent',
        description: `A new invite link has been sent to ${user.email}.`,
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to resend invite',
      })
    } finally {
      setResendingId(null)
    }
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
            Manage user accounts, roles, and invitations
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Mail className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No users found. Invite your first team member.</p>
                <Button onClick={handleCreateClick} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Invite User
                </Button>
            </div>
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
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
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
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvite(user)}
                          disabled={resendingId === user.id}
                          title="Resend invite email with set-password link"
                        >
                          {resendingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editing ? 'Edit User' : 'Invite New User'}</DialogTitle>
                <DialogDescription>
                    {editing 
                        ? 'Update user details and permissions.' 
                        : 'Send an email invitation to a new user.'}
                </DialogDescription>
            </DialogHeader>
            
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
                  placeholder="colleague@example.com"
                />
                {!editing && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    An invitation link will be sent to this address
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entityId">Company</Label>
                <select
                  id="entityId"
                  value={formData.entityId}
                  onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background"
                  required
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                    Select the appropriate access level for this user.
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editing ? 'Update User' : 'Send Invitation'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
