'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import * as Tabs from '@radix-ui/react-tabs'
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
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { getInvoices, deleteInvoice, getInvoice } from '@/app/actions/invoices'
import { sendInvoiceEmail } from '@/app/actions/email'
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Download, Eye, Mail, Edit, Trash2, Loader2 } from 'lucide-react'
import type { Invoice } from '@prisma/client'

type InvoiceWithRelations = Invoice & {
  client?: { name: string; companyName: string | null } | null
  subcontractor?: { name: string } | null
  supplier?: { name: string } | null
  job?: { jobNumber: string; jobDescription: string } | null
  sentDate?: Date | null
  receivedDate?: Date | null
  description?: string | null
  purchaseOrderNumber?: string | null
  discountAmount?: number | null
  discountPercentage?: number | null
  discountType?: string | null
  paidAmount?: number | null
  outstandingAmount?: number | null
  paymentReference?: string | null
}

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithRelations | null>(null)
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceWithRelations | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setIsLoading(true)
      const data = await getInvoices()
      setInvoices(data as InvoiceWithRelations[])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load invoices',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClick = () => {
    setEditingInvoice(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = async (invoice: InvoiceWithRelations) => {
    try {
      const fullInvoice = await getInvoice(invoice.id)
      setEditingInvoice(fullInvoice as InvoiceWithRelations)
      setIsDialogOpen(true)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load invoice details',
      })
    }
  }

  const handleDeleteClick = (invoice: InvoiceWithRelations) => {
    setInvoiceToDelete(invoice)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return

    try {
      setDeletingInvoiceId(invoiceToDelete.id)
      await deleteInvoice(invoiceToDelete.id)
      await loadInvoices()
      toast({
        variant: 'success',
        title: 'Invoice deleted',
        description: `Invoice ${invoiceToDelete.invoiceNumber} has been successfully deleted.`,
      })
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete invoice',
      })
    } finally {
      setDeletingInvoiceId(null)
    }
  }

  const handleViewPdf = (id: string) => {
    window.open(`/api/invoices/${id}/pdf?preview=1`, '_blank')
  }

  const handleDownload = (id: string) => {
    window.open(`/api/invoices/${id}/pdf`, '_blank')
  }

  const handleSendEmail = async (id: string) => {
    try {
      setSendingEmailId(id)
      await sendInvoiceEmail(id)
      toast({
        variant: 'success',
        title: 'Email sent',
        description: 'Invoice has been emailed to the client.',
      })
      // Refresh to update status if changed to SENT
      loadInvoices()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error sending email',
        description: error instanceof Error ? error.message : 'Failed to send email',
      })
    } finally {
      setSendingEmailId(null)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    const action = editingInvoice ? 'updated' : 'created'
    toast({
      variant: 'success',
      title: `Invoice ${action}`,
      description: `Invoice has been successfully ${action}.`,
    })
    setEditingInvoice(null)
    loadInvoices()
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice as any).description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice as any).purchaseOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.subcontractor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'sales') return matchesSearch && invoice.type === 'SALES'
    if (activeTab === 'purchase') return matchesSearch && invoice.type === 'PURCHASE'
    if (activeTab === 'overdue') return matchesSearch && invoice.status === 'OVERDUE'

    return matchesSearch
  })

  const getClientName = (invoice: InvoiceWithRelations) => {
    if (invoice.client) {
      return invoice.client.companyName || invoice.client.name
    }
    if (invoice.subcontractor) {
      return invoice.subcontractor.name
    }
    if (invoice.supplier) {
      return invoice.supplier.name
    }
    return 'Unknown'
  }

  const stats = {
    total: invoices.length,
    sales: invoices.filter(i => i.type === 'SALES').length,
    purchase: invoices.filter(i => i.type === 'PURCHASE').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    totalValue: invoices.reduce((sum, i) => sum + i.total, 0),
    outstanding: invoices.filter(i => i.status !== 'PAID' && i.type === 'SALES').reduce((sum, i) => {
      const outstanding = (i as any).outstandingAmount ?? (i.total - ((i as any).paidAmount ?? 0))
      return sum + outstanding
    }, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-gray-500 mt-1">
            Manage sales and purchase invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sales Invoices</CardDescription>
            <CardTitle className="text-3xl">{stats.sales}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.outstanding)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.overdue}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex gap-4 border-b mb-4">
              <Tabs.Trigger
                value="all"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                All Invoices
              </Tabs.Trigger>
              <Tabs.Trigger
                value="sales"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Sales
              </Tabs.Trigger>
              <Tabs.Trigger
                value="purchase"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Purchase
              </Tabs.Trigger>
              <Tabs.Trigger
                value="overdue"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-600"
              >
                Overdue
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          <CardDescription>
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client/Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500">Loading invoices...</p>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500">No invoices found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const outstanding = (invoice as any).outstandingAmount ?? (invoice.total - ((invoice as any).paidAmount ?? 0))
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        #{invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.type === 'SALES' ? 'default' : 'secondary'}>
                          {invoice.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{getClientName(invoice)}</div>
                        {(invoice as any).job && (
                          <div className="text-xs text-gray-500">Job: {(invoice as any).job.jobNumber}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        <div>{formatDate(invoice.date)}</div>
                        {invoice.type === 'SALES' && (invoice as any).sentDate && (
                          <div className="text-xs">Sent: {formatDate((invoice as any).sentDate)}</div>
                        )}
                        {invoice.type === 'PURCHASE' && (invoice as any).receivedDate && (
                          <div className="text-xs">Received: {formatDate((invoice as any).receivedDate)}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {(invoice as any).purchaseOrderNumber || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        {outstanding > 0 ? (
                          <span className="font-medium text-red-600">{formatCurrency(outstanding)}</span>
                        ) : (
                          <span className="text-gray-400">£0.00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getInvoiceStatusColor(invoice.status)}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {invoice.status !== 'PAID' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(invoice)}
                            disabled={deletingInvoiceId === invoice.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPdf(invoice.id)}
                          title="View PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(invoice.id)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {invoice.type === 'SALES' && invoice.status !== 'PAID' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendEmail(invoice.id)}
                            disabled={sendingEmailId === invoice.id}
                          >
                            {sendingEmailId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
            </DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice as any}
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
              This action cannot be undone. This will permanently delete invoice{' '}
              <strong>{invoiceToDelete?.invoiceNumber}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingInvoiceId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
