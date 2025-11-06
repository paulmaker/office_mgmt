'use client'

import { useState } from 'react'
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
import { mockTimesheets, mockSubcontractors } from '@/lib/mock-data'
import { formatCurrency, formatDate, getTimesheetStatusColor } from '@/lib/utils'
import { Plus, Search, Check, X, Download } from 'lucide-react'

export default function TimesheetsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const getSubcontractorName = (subcontractorId: string) => {
    const sub = mockSubcontractors.find(s => s.id === subcontractorId)
    return sub?.name || 'Unknown'
  }

  const getSubcontractorCISStatus = (subcontractorId: string) => {
    const sub = mockSubcontractors.find(s => s.id === subcontractorId)
    return sub?.cisStatus || 'NOT_VERIFIED'
  }

  const filteredTimesheets = mockTimesheets.filter(timesheet => {
    const subName = getSubcontractorName(timesheet.subcontractorId)
    return (
      subName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const stats = {
    total: mockTimesheets.length,
    submitted: mockTimesheets.filter(t => t.status === 'SUBMITTED').length,
    approved: mockTimesheets.filter(t => t.status === 'APPROVED').length,
    processed: mockTimesheets.filter(t => t.status === 'PROCESSED').length,
    paid: mockTimesheets.filter(t => t.status === 'PAID').length,
    totalValue: mockTimesheets.reduce((sum, t) => sum + t.netAmount, 0),
    totalCIS: mockTimesheets.reduce((sum, t) => sum + t.cisDeduction, 0),
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
        <Button>
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
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>CIS</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.map((timesheet) => {
                const cisStatus = getSubcontractorCISStatus(timesheet.subcontractorId)
                return (
                  <TableRow key={timesheet.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getSubcontractorName(timesheet.subcontractorId)}</span>
                        <span className="text-xs text-gray-500">{cisStatus.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      <div className="flex flex-col text-sm">
                        <span>{formatDate(timesheet.periodStart)}</span>
                        <span className="text-xs text-gray-400">to {formatDate(timesheet.periodEnd)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{timesheet.hoursWorked}h</TableCell>
                    <TableCell>{formatCurrency(timesheet.rate)}/h</TableCell>
                    <TableCell className="font-medium">{formatCurrency(timesheet.grossAmount)}</TableCell>
                    <TableCell className="text-red-600">
                      {timesheet.cisDeduction > 0 ? `-${formatCurrency(timesheet.cisDeduction)}` : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(timesheet.netAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          timesheet.status === 'PAID' ? 'success' :
                          timesheet.status === 'APPROVED' ? 'default' :
                          timesheet.status === 'REJECTED' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {timesheet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {timesheet.status === 'SUBMITTED' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredTimesheets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No timesheets found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
