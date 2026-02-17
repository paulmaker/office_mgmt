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
import { JobPriceForm } from '@/components/job-prices/job-price-form'
import { getJobPrices, deleteJobPrice, getJobPrice } from '@/app/actions/job-prices'
import { getClients } from '@/app/actions/clients'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import type { JobPrice } from '@prisma/client'

type JobPriceWithRelations = JobPrice & {
  client: { name: string; companyName: string | null }
}

export default function JobPricesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [jobPrices, setJobPrices] = useState<JobPriceWithRelations[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingJobPrice, setEditingJobPrice] = useState<JobPriceWithRelations | null>(null)
  const [deletingJobPriceId, setDeletingJobPriceId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jobPriceToDelete, setJobPriceToDelete] = useState<JobPriceWithRelations | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadJobPrices()
  }, [selectedClientId])

  const loadData = async () => {
    try {
      const [jobPricesData, clientsData] = await Promise.all([
        getJobPrices(),
        getClients(),
      ])
      setJobPrices(jobPricesData as JobPriceWithRelations[])
      setClients(clientsData)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadJobPrices = async () => {
    try {
      setIsLoading(true)
      const data = await getJobPrices(selectedClientId || undefined)
      setJobPrices(data as JobPriceWithRelations[])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load job prices',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClick = () => {
    setEditingJobPrice(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = async (jobPrice: JobPriceWithRelations) => {
    try {
      const fullJobPrice = await getJobPrice(jobPrice.id)
      setEditingJobPrice(fullJobPrice as JobPriceWithRelations)
      setIsDialogOpen(true)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load job price details',
      })
    }
  }

  const handleDeleteClick = (jobPrice: JobPriceWithRelations) => {
    setJobPriceToDelete(jobPrice)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!jobPriceToDelete) return

    try {
      setDeletingJobPriceId(jobPriceToDelete.id)
      await deleteJobPrice(jobPriceToDelete.id)
      await loadJobPrices()
      toast({
        variant: 'success',
        title: 'Job price deleted',
        description: 'Job price has been successfully deleted.',
      })
      setDeleteDialogOpen(false)
      setJobPriceToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete job price',
      })
    } finally {
      setDeletingJobPriceId(null)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    const action = editingJobPrice ? 'updated' : 'created'
    toast({
      variant: 'success',
      title: `Job price ${action}`,
      description: `Job price has been successfully ${action}.`,
    })
    setEditingJobPrice(null)
    loadJobPrices()
  }

  const filteredJobPrices = jobPrices.filter(jobPrice => {
    const matchesSearch =
      jobPrice.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobPrice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobPrice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobPrice.client.companyName?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const stats = {
    total: jobPrices.length,
    active: jobPrices.filter(jp => jp.isActive).length,
    inactive: jobPrices.filter(jp => !jp.isActive).length,
    totalValue: jobPrices.reduce((sum, jp) => sum + jp.price, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Prices</h1>
          <p className="text-gray-500 mt-1">
            Manage set job prices for each client
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          New Job Price
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Prices</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-3xl text-gray-400">{stats.inactive}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.totalValue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            {filteredJobPrices.length} job price{filteredJobPrices.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search job prices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-64">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-gray-500">Loading job prices...</p>
                  </TableCell>
                </TableRow>
              ) : filteredJobPrices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-gray-500">No job prices found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobPrices.map((jobPrice) => (
                  <TableRow key={jobPrice.id}>
                    <TableCell className="font-medium">
                      {jobPrice.client.name}
                    </TableCell>
                    <TableCell>{jobPrice.jobType}</TableCell>
                    <TableCell className="max-w-xs truncate">{jobPrice.description}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(jobPrice.price)}</TableCell>
                    <TableCell>
                      {jobPrice.isActive ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(jobPrice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(jobPrice)}
                          disabled={deletingJobPriceId === jobPrice.id}
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
              {editingJobPrice ? 'Edit Job Price' : 'Create New Job Price'}
            </DialogTitle>
          </DialogHeader>
          <JobPriceForm
            jobPrice={editingJobPrice as any}
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
              This action cannot be undone. This will permanently delete this job price.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobPriceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingJobPriceId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
