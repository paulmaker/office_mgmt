'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SubcontractorForm } from '@/components/subcontractors/subcontractor-form'
import { getSubcontractors, deleteSubcontractor } from '@/app/actions/subcontractors'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Edit, Mail, Phone, MapPin, Trash2 } from 'lucide-react'
import type { Subcontractor } from '@prisma/client'

export default function SubcontractorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null)
  const [deletingSubcontractorId, setDeletingSubcontractorId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subcontractorToDelete, setSubcontractorToDelete] = useState<Subcontractor | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadSubcontractors()
  }, [])

  const loadSubcontractors = async () => {
    try {
      setIsLoading(true)
      const data = await getSubcontractors()
      setSubcontractors(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load subcontractors',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClick = () => {
    setEditingSubcontractor(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor)
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (subcontractor: Subcontractor) => {
    setSubcontractorToDelete(subcontractor)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!subcontractorToDelete) return

    try {
      setDeletingSubcontractorId(subcontractorToDelete.id)
      await deleteSubcontractor(subcontractorToDelete.id)
      await loadSubcontractors()
      toast({
        variant: 'success',
        title: 'Subcontractor deleted',
        description: `${subcontractorToDelete.name} has been successfully deleted.`,
      })
      setDeleteDialogOpen(false)
      setSubcontractorToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete subcontractor',
      })
    } finally {
      setDeletingSubcontractorId(null)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    const action = editingSubcontractor ? 'updated' : 'created'
    toast({
      variant: 'success',
      title: `Subcontractor ${action}`,
      description: `Subcontractor has been successfully ${action}.`,
    })
    setEditingSubcontractor(null)
    loadSubcontractors()
  }

  const filteredSubcontractors = subcontractors.filter(subcontractor =>
    subcontractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subcontractor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subcontractor.niNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCISStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED_GROSS':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Verified Gross</Badge>
      case 'VERIFIED_NET':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Verified Net</Badge>
      case 'NOT_VERIFIED':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Not Verified</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subcontractors</h1>
          <p className="text-gray-500 mt-1">
            Manage your subcontractor database and CIS information
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subcontractor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subcontractors</CardTitle>
          <CardDescription>
            {filteredSubcontractors.length} subcontractor{filteredSubcontractors.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search subcontractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>NI Number</TableHead>
                <TableHead>UTR</TableHead>
                <TableHead>CIS Status</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-gray-500">Loading subcontractors...</p>
                  </TableCell>
                </TableRow>
              ) : filteredSubcontractors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-gray-500">No subcontractors found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubcontractors.map((subcontractor) => (
                  <TableRow key={subcontractor.id}>
                    <TableCell className="font-medium">{subcontractor.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{subcontractor.email}</span>
                        </div>
                        {subcontractor.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{subcontractor.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{subcontractor.niNumber || '-'}</TableCell>
                    <TableCell>{subcontractor.utr || '-'}</TableCell>
                    <TableCell>{getCISStatusBadge(subcontractor.cisStatus)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {subcontractor.paymentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(subcontractor.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(subcontractor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(subcontractor)}
                          disabled={deletingSubcontractorId === subcontractor.id}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Subcontractors</CardDescription>
            <CardTitle className="text-3xl">{subcontractors.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Active subcontractor accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CIS Verified</CardDescription>
            <CardTitle className="text-3xl">
              {subcontractors.filter(s => s.cisStatus !== 'NOT_VERIFIED').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Subcontractors with verified CIS status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CIS Payment Type</CardDescription>
            <CardTitle className="text-3xl">
              {subcontractors.filter(s => s.paymentType === 'CIS').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Subcontractors on CIS payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubcontractor ? 'Edit Subcontractor' : 'Create New Subcontractor'}
            </DialogTitle>
          </DialogHeader>
          <SubcontractorForm
            subcontractor={editingSubcontractor}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              <strong>{subcontractorToDelete?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSubcontractorToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingSubcontractorId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
