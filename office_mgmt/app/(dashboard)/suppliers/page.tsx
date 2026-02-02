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
import { SupplierForm } from '@/components/suppliers/supplier-form'
import { getSuppliers, deleteSupplier } from '@/app/actions/suppliers'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Edit, Mail, Phone, MapPin, Trash2 } from 'lucide-react'
import type { Supplier } from '@prisma/client'

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setIsLoading(true)
      const data = await getSuppliers()
      setSuppliers(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load suppliers',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClick = () => {
    setEditingSupplier(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!supplierToDelete) return

    try {
      setDeletingSupplierId(supplierToDelete.id)
      await deleteSupplier(supplierToDelete.id)
      await loadSuppliers()
      toast({
        variant: 'success',
        title: 'Supplier deleted',
        description: `${supplierToDelete.name} has been successfully deleted.`,
      })
      setDeleteDialogOpen(false)
      setSupplierToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete supplier',
      })
    } finally {
      setDeletingSupplierId(null)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    const action = editingSupplier ? 'updated' : 'created'
    toast({
      variant: 'success',
      title: `Supplier ${action}`,
      description: `Supplier has been successfully ${action}.`,
    })
    setEditingSupplier(null)
    loadSuppliers()
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-gray-500 mt-1">
            Manage your suppliers and vendor information
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>
            {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-gray-500">Loading suppliers...</p>
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-gray-500">No suppliers found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.companyName || '-'}</TableCell>
                    <TableCell>{supplier.accountNumber || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{supplier.phone}</span>
                          </div>
                        )}
                        {!supplier.email && !supplier.phone && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.address ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600">{supplier.address}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.vatRegistered && (
                        <Badge variant="secondary" className="text-xs">VAT</Badge>
                      )}
                      {!supplier.vatRegistered && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{supplier.paymentTerms} days</TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(supplier.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(supplier)}
                          disabled={deletingSupplierId === supplier.id}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Create New Supplier'}
            </DialogTitle>
          </DialogHeader>
          <SupplierForm
            supplier={editingSupplier}
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
              <strong>{supplierToDelete?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingSupplierId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Suppliers</CardDescription>
            <CardTitle className="text-3xl">{suppliers.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Active supplier accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>VAT Registered</CardDescription>
            <CardTitle className="text-3xl">
              {suppliers.filter(s => s.vatRegistered).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Suppliers registered for VAT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Payment Terms</CardDescription>
            <CardTitle className="text-3xl">
              {suppliers.length > 0
                ? Math.round(
                    suppliers.reduce((sum, s) => sum + s.paymentTerms, 0) /
                      suppliers.length
                  )
                : 0}{' '}
              days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Average payment terms</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
