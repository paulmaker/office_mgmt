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
import { TimesheetForm } from '@/components/timesheets/timesheet-form'
import { getTimesheets, deleteTimesheet, approveTimesheet, rejectTimesheet, markTimesheetAsPaid, getTimesheet } from '@/app/actions/timesheets'
import { formatCurrency, formatDate, getTimesheetStatusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Check, X, Download, Edit, Trash2, Receipt, Banknote } from 'lucide-react'
import type { Timesheet } from '@prisma/client'

type TimesheetWithRelations = Timesheet & {
  subcontractor: { name: string; cisStatus: string }
}

export default function TimesheetsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [timesheets, setTimesheets] = useState<TimesheetWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetWithRelations | null>(null)
  const [deletingTimesheetId, setDeletingTimesheetId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [timesheetToDelete, setTimesheetToDelete] = useState<TimesheetWithRelations | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTimesheets()
  }, [])

  const loadTimesheets = async () => {
    try {
      setIsLoading(true)
      const data = await getTimesheets()
      setTimesheets(data as TimesheetWithRelations[])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load timesheets',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClick = () => {
    setEditingTimesheet(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = async (timesheet: TimesheetWithRelations) => {
    try {
      const fullTimesheet = await getTimesheet(timesheet.id)
      setEditingTimesheet(fullTimesheet as TimesheetWithRelations)
      setIsDialogOpen(true)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load timesheet details',
      })
    }
  }

  const handleDeleteClick = (timesheet: TimesheetWithRelations) => {
    setTimesheetToDelete(timesheet)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!timesheetToDelete) return

    try {
      setDeletingTimesheetId(timesheetToDelete.id)
      await deleteTimesheet(timesheetToDelete.id)
      await loadTimesheets()
      toast({
        variant: 'success',
        title: 'Timesheet deleted',
        description: 'Timesheet has been successfully deleted.',
      })
      setDeleteDialogOpen(false)
      setTimesheetToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete timesheet',
      })
    } finally {
      setDeletingTimesheetId(null)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await approveTimesheet(id)
      await loadTimesheets()
      toast({
        variant: 'success',
        title: 'Timesheet approved',
        description: 'Timesheet has been approved and is ready for processing.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve timesheet',
      })
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectTimesheet(id, 'Rejected by user')
      await loadTimesheets()
      toast({
        variant: 'success',
        title: 'Timesheet rejected',
        description: 'Timesheet has been rejected.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject timesheet',
      })
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markTimesheetAsPaid(id)
      await loadTimesheets()
      toast({
        variant: 'success',
        title: 'Timesheet marked as paid',
        description: 'Timesheet has been marked as paid.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark timesheet as paid',
      })
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    const action = editingTimesheet ? 'updated' : 'created'
    toast({
      variant: 'success',
      title: `Timesheet ${action}`,
      description: `Timesheet has been successfully ${action}.`,
    })
    setEditingTimesheet(null)
    loadTimesheets()
  }

  const handleDownload = (id: string) => {
    // Find the timesheet to get details for the CSV
    const timesheet = timesheets.find(t => t.id === id)
    if (!timesheet) return

    // Create CSV content
    const csvContent = [
      ['Timesheet Details'],
      [''],
      ['Subcontractor', timesheet.subcontractor?.name || ''],
      ['CIS Status', timesheet.subcontractor?.cisStatus?.replace('_', ' ') || ''],
      [''],
      ['Period Start', formatDate(timesheet.periodStart)],
      ['Period End', formatDate(timesheet.periodEnd)],
      ['Submitted Date', timesheet.submittedDate ? formatDate(timesheet.submittedDate) : ''],
      ['Submitted Via', timesheet.submittedVia || ''],
      [''],
      ['Hours Worked', timesheet.hoursWorked.toString()],
      ['Rate (£/hr)', timesheet.rate.toString()],
      ['Gross Amount', timesheet.grossAmount.toString()],
      ['Expenses', (timesheet.expenses || 0).toString()],
      ['CIS Deduction', timesheet.cisDeduction.toString()],
      ['Net Amount', timesheet.netAmount.toString()],
      [''],
      ['Receipts Received', timesheet.receiptsReceived ? 'Yes' : 'No'],
      ['Status', timesheet.status],
      ['Notes', timesheet.notes || ''],
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `timesheet-${timesheet.subcontractor?.name?.replace(/\s+/g, '-') || 'unknown'}-${formatDate(timesheet.periodStart)}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      variant: 'success',
      title: 'Downloaded',
      description: 'Timesheet has been downloaded as CSV.',
    })
  }

  const filteredTimesheets = timesheets.filter(timesheet => {
    const subName = timesheet.subcontractor?.name.toLowerCase() || ''
    return (
      subName.includes(searchTerm.toLowerCase()) ||
      timesheet.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const stats = {
    total: timesheets.length,
    submitted: timesheets.filter(t => t.status === 'SUBMITTED').length,
    approved: timesheets.filter(t => t.status === 'APPROVED').length,
    processed: timesheets.filter(t => t.status === 'PROCESSED').length,
    paid: timesheets.filter(t => t.status === 'PAID').length,
    totalValue: timesheets.reduce((sum, t) => sum + t.netAmount, 0),
    totalCIS: timesheets.reduce((sum, t) => sum + t.cisDeduction, 0),
    totalExpenses: timesheets.reduce((sum, t) => sum + (t.expenses || 0), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-gray-500 mt-1">
            Review and approve subcontractor timesheets
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Timesheet
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.submitted}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Ready for processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Net Pay</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.totalValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">After CIS deductions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total CIS Deducted</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.totalCIS)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">This period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Timesheets</CardTitle>
          <CardDescription>
            {filteredTimesheets.length} timesheet{filteredTimesheets.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search timesheets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subcontractor</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>CIS</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Receipts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8">
                    <p className="text-gray-500">Loading timesheets...</p>
                  </TableCell>
                </TableRow>
              ) : filteredTimesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8">
                    <p className="text-gray-500">No timesheets found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimesheets.map((timesheet) => {
                  const cisStatus = timesheet.subcontractor?.cisStatus || 'NOT_VERIFIED'
                  return (
                    <TableRow key={timesheet.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{timesheet.subcontractor?.name}</span>
                          <span className="text-xs text-gray-500">{cisStatus.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        <div className="flex flex-col text-sm">
                          <span>{formatDate(timesheet.periodStart)}</span>
                          <span className="text-xs text-gray-400">to {formatDate(timesheet.periodEnd)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {timesheet.submittedDate ? formatDate(timesheet.submittedDate) : '-'}
                      </TableCell>
                      <TableCell>{timesheet.hoursWorked}h</TableCell>
                      <TableCell>{formatCurrency(timesheet.rate)}/h</TableCell>
                      <TableCell className="font-medium">{formatCurrency(timesheet.grossAmount)}</TableCell>
                      <TableCell>
                        {timesheet.expenses > 0 ? (
                          <span className="text-sm text-blue-600">+{formatCurrency(timesheet.expenses)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {timesheet.cisDeduction > 0 ? `-${formatCurrency(timesheet.cisDeduction)}` : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(timesheet.netAmount)}
                      </TableCell>
                      <TableCell>
                        {timesheet.receiptsReceived ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Receipt className="h-4 w-4" />
                            <span className="text-sm">Yes</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getTimesheetStatusColor(timesheet.status)}
                        >
                          {timesheet.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {timesheet.status === 'SUBMITTED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(timesheet.id)}
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleReject(timesheet.id)}
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(timesheet.status === 'APPROVED' || timesheet.status === 'PROCESSED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleMarkAsPaid(timesheet.id)}
                              title="Mark as Paid"
                            >
                              <Banknote className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(timesheet)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {timesheet.status !== 'PROCESSED' && timesheet.status !== 'PAID' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(timesheet)}
                              disabled={deletingTimesheetId === timesheet.id}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(timesheet.id)}
                            title="Download timesheet"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTimesheet ? 'Edit Timesheet' : 'Create New Timesheet'}
            </DialogTitle>
          </DialogHeader>
          <TimesheetForm
            timesheet={editingTimesheet as any}
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
              This action cannot be undone. This will permanently delete this timesheet and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTimesheetToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingTimesheetId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
