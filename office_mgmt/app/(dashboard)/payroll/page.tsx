'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import { Download, FileText, Calendar } from 'lucide-react'

export default function PayrollPage() {
  const approvedTimesheets = mockTimesheets.filter(t => t.status === 'APPROVED' || t.status === 'PROCESSED' || t.status === 'PAID')

  const getSubcontractor = (id: string) => {
    return mockSubcontractors.find(s => s.id === id)
  }

  const totalGross = approvedTimesheets.reduce((sum, t) => sum + t.grossAmount, 0)
  const totalCIS = approvedTimesheets.reduce((sum, t) => sum + t.cisDeduction, 0)
  const totalNet = approvedTimesheets.reduce((sum, t) => sum + t.netAmount, 0)

  const cisByContractor = mockSubcontractors.map(sub => {
    const timesheets = approvedTimesheets.filter(t => t.subcontractorId === sub.id)
    const gross = timesheets.reduce((sum, t) => sum + t.grossAmount, 0)
    const cis = timesheets.reduce((sum, t) => sum + t.cisDeduction, 0)
    const net = timesheets.reduce((sum, t) => sum + t.netAmount, 0)
    return { subcontractor: sub, gross, cis, net, count: timesheets.length }
  }).filter(item => item.count > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CIS Payroll</h1>
          <p className="text-gray-500 mt-1">
            Process CIS payments and generate returns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            CIS Return
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Process Payments
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Gross</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalGross)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">{approvedTimesheets.length} timesheets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CIS Deductions</CardDescription>
            <CardTitle className="text-2xl text-red-600">{formatCurrency(totalCIS)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">To remit to HMRC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net to Pay</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(totalNet)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">After CIS</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contractors</CardDescription>
            <CardTitle className="text-3xl">{cisByContractor.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Active this period</p>
          </CardContent>
        </Card>
      </div>

      {/* CIS Summary by Contractor */}
      <Card>
        <CardHeader>
          <CardTitle>CIS Summary by Contractor</CardTitle>
          <CardDescription>Breakdown of payments and deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>CIS Status</TableHead>
                <TableHead>Verification #</TableHead>
                <TableHead>Timesheets</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>CIS Deduction</TableHead>
                <TableHead>Net Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cisByContractor.map((item) => (
                <TableRow key={item.subcontractor.id}>
                  <TableCell className="font-medium">{item.subcontractor.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.subcontractor.cisStatus === 'VERIFIED_GROSS' ? 'success' :
                        item.subcontractor.cisStatus === 'VERIFIED_NET' ? 'default' :
                        'secondary'
                      }
                    >
                      {item.subcontractor.cisStatus.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 font-mono text-sm">
                    {item.subcontractor.cisVerificationNumber || '-'}
                  </TableCell>
                  <TableCell>{item.count}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.gross)}</TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {item.cis > 0 ? `-${formatCurrency(item.cis)}` : '-'}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    {formatCurrency(item.net)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Timesheet Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Details</CardTitle>
          <CardDescription>All approved timesheets ready for processing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>CIS Rate</TableHead>
                <TableHead>CIS Amount</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedTimesheets.map((timesheet) => {
                const sub = getSubcontractor(timesheet.subcontractorId)
                const cisRate = timesheet.cisDeduction > 0 ? (timesheet.cisDeduction / timesheet.grossAmount) * 100 : 0
                return (
                  <TableRow key={timesheet.id}>
                    <TableCell className="font-medium">{sub?.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                    </TableCell>
                    <TableCell>{timesheet.hoursWorked}h</TableCell>
                    <TableCell>{formatCurrency(timesheet.rate)}</TableCell>
                    <TableCell>{formatCurrency(timesheet.grossAmount)}</TableCell>
                    <TableCell>{cisRate > 0 ? `${cisRate.toFixed(0)}%` : '-'}</TableCell>
                    <TableCell className="text-red-600">
                      {timesheet.cisDeduction > 0 ? `-${formatCurrency(timesheet.cisDeduction)}` : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(timesheet.netAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={timesheet.status === 'PAID' ? 'success' : 'default'}>
                        {timesheet.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
