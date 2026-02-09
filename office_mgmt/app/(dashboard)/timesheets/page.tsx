'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { sendTimesheetEmail } from '@/app/actions/email'
import { formatCurrency, formatDate, getTimesheetStatusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Check, X, Download, Edit, Trash2, Banknote, Mail } from 'lucide-react'
import type { Timesheet } from '@prisma/client'

type TimesheetWithRelations = Timesheet & {
  rateType?: 'HOURLY' | 'DAILY'
  daysWorked?: number | null
  dailyRate?: number | null
  additionalHours?: number
  additionalHoursRate?: number
  subcontractor: { name: string; cisStatus: string; email?: string }
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
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadTimesheets = useCallback(async () => {
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
  }, [toast])

  useEffect(() => {
    loadTimesheets()
  }, [loadTimesheets])

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

  const handleEmailTimesheet = async (id: string) => {
    try {
      setSendingEmailId(id)
      await sendTimesheetEmail(id)
      toast({
        variant: 'success',
        title: 'Email sent',
        description: 'Timesheet summary has been emailed to the subcontractor.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email',
      })
    } finally {
      setSendingEmailId(null)
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

  const buildSingleTimesheetCsv = (timesheet: TimesheetWithRelations) => {
    const rateType = timesheet.rateType ?? 'HOURLY'
    return [
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
      ['Rate Type', rateType],
      ['Hours Worked', timesheet.hoursWorked.toString()],
      ['Days Worked', (timesheet.daysWorked ?? '').toString()],
      [rateType === 'DAILY' ? 'Rate (£/day)' : 'Rate (£/hr)', timesheet.rate.toString()],
      ['Gross Amount', timesheet.grossAmount.toString()],
      ['Expenses', (timesheet.expenses || 0).toString()],
      ['CIS Deduction', timesheet.cisDeduction.toString()],
      ['Net Amount', timesheet.netAmount.toString()],
      [''],
      ['Receipts Received', timesheet.receiptsReceived ? 'Yes' : 'No'],
      ['Status', timesheet.status],
      ['Notes', timesheet.notes || ''],
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  }

  const handleDownload = (id: string) => {
    const timesheet = timesheets.find(t => t.id === id)
    if (!timesheet) return
    const csvContent = buildSingleTimesheetCsv(timesheet)
    downloadCsv(csvContent, `timesheet-${timesheet.subcontractor?.name?.replace(/\s+/g, '-') || 'unknown'}-${formatDate(timesheet.periodStart)}.csv`)
    toast({
      variant: 'success',
      title: 'Downloaded',
      description: 'Timesheet has been downloaded as CSV.',
    })
  }

  const handleDownloadAll = () => {
    if (filteredTimesheets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No timesheets',
        description: 'There are no timesheets to download.',
      })
      return
    }
    const header = [
      'Subcontractor',
      'CIS Status',
      'Period Start',
      'Period End',
      'Submitted Date',
      'Submitted Via',
      'Rate Type',
      'Hours Worked',
      'Days Worked',
      'Rate (£/hr or £/day)',
      'Gross Amount',
      'Expenses',
      'CIS Deduction',
      'Net Amount',
      'Receipts Received',
      'Status',
      'Notes',
    ]
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = filteredTimesheets.map((t: TimesheetWithRelations) => {
      const rateType = t.rateType ?? 'HOURLY'
      return [
        t.subcontractor?.name || '',
        t.subcontractor?.cisStatus?.replace('_', ' ') || '',
        formatDate(t.periodStart),
        formatDate(t.periodEnd),
        t.submittedDate ? formatDate(t.submittedDate) : '',
        t.submittedVia || '',
        rateType,
        t.hoursWorked.toString(),
        t.daysWorked != null ? String(t.daysWorked) : '',
        t.rate.toString(),
        t.grossAmount.toString(),
        (t.expenses || 0).toString(),
        t.cisDeduction.toString(),
        t.netAmount.toString(),
        t.receiptsReceived ? 'Yes' : 'No',
        t.status,
        t.notes || '',
      ]
    })
    const csvContent = [header.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
    downloadCsv(csvContent, `timesheets-export-${formatDate(new Date())}.csv`)
    toast({
      variant: 'success',
      title: 'Downloaded',
      description: `${filteredTimesheets.length} timesheet(s) exported as CSV.`,
    })
  }

  function downloadCsv(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadAll} disabled={timesheets.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download all (CSV)
          </Button>
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add Timesheet
          </Button>
        </div>
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
                <TableHead>Submitted</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>CIS</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500">Loading timesheets...</p>
                  </TableCell>
                </TableRow>
              ) : filteredTimesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500">No timesheets found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimesheets.map((timesheet) => {
                  const cisStatus = timesheet.subcontractor?.cisStatus || 'NOT_VERIFIED'
                  return (
                    <TableRow key={timesheet.id}>
                      <TableCell className="align-top">
                        <div className="flex flex-col">
                          <span className="font-medium">{timesheet.subcontractor?.name}</span>
                          <span className="text-xs text-gray-500">{cisStatus.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-500">
                        {timesheet.submittedDate ? formatDate(timesheet.submittedDate) : '-'}
                      </TableCell>
                      <TableCell className="align-top">
                        {(() => {
                          const t = timesheet as TimesheetWithRelations
                          const additionalHours = t.additionalHours ?? 0
                          const lines: string[] = []
                          if (timesheet.hoursWorked > 0 && t.rateType !== 'DAILY') lines.push(`${timesheet.hoursWorked} ${timesheet.hoursWorked === 1 ? 'hour' : 'hours'}`)
                          if (t.daysWorked != null && t.daysWorked > 0) lines.push(`${t.daysWorked} ${t.daysWorked === 1 ? 'day' : 'days'}`)
                          if (additionalHours > 0) lines.push(`${additionalHours} additional ${additionalHours === 1 ? 'hour' : 'hours'}`)
                          if (lines.length === 0) return <span className="text-gray-400">-</span>
                          return (
                            <div className="flex flex-col gap-0.5 text-sm">
                              {lines.map((line, i) => (
                                <span key={i}>{line}</span>
                              ))}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="align-top">
                        {(() => {
                          const t = timesheet as TimesheetWithRelations
                          const additionalHours = t.additionalHours ?? 0
                          const additionalHoursRate = t.additionalHoursRate ?? 0
                          const lines: string[] = []
                          if (timesheet.hoursWorked > 0 && t.rateType !== 'DAILY' && timesheet.rate > 0) lines.push(formatCurrency(timesheet.rate))
                          if (t.daysWorked != null && t.daysWorked > 0 && (t.dailyRate ?? (t.rateType === 'DAILY' ? timesheet.rate : 0)) > 0) lines.push(formatCurrency(t.dailyRate ?? (t.rateType === 'DAILY' ? timesheet.rate : 0)))
                          if (additionalHours > 0 && additionalHoursRate > 0) lines.push(formatCurrency(additionalHoursRate))
                          if (lines.length === 0) return <span className="text-gray-400">-</span>
                          return (
                            <div className="flex flex-col gap-0.5 text-sm">
                              {lines.map((line, i) => (
                                <span key={i}>{line}</span>
                              ))}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="align-top font-medium">{formatCurrency(timesheet.grossAmount)}</TableCell>
                      <TableCell className="align-top">
                        {timesheet.expenses > 0 ? (
                          <span className="text-sm text-blue-600">+{formatCurrency(timesheet.expenses)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-red-600 whitespace-nowrap">
                        {timesheet.cisDeduction > 0 ? `-${formatCurrency(timesheet.cisDeduction)}` : '-'}
                      </TableCell>
                      <TableCell className="align-top font-medium text-green-600">
                        {formatCurrency(timesheet.netAmount)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant="secondary"
                          className={getTimesheetStatusColor(timesheet.status)}
                        >
                          {timesheet.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top pt-2 text-right">
                        <div className="flex -mt-0.5 items-start justify-end gap-1">
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
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEmailTimesheet(timesheet.id)}
                            disabled={!timesheet.subcontractor?.email || sendingEmailId === timesheet.id}
                            title={timesheet.subcontractor?.email ? 'Email to subcontractor' : 'No subcontractor email'}
                          >
                            <Mail className="h-4 w-4" />
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
                            title="Download as CSV"
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
            timesheet={editingTimesheet}
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
