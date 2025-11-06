'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockInvoices, mockTimesheets, getDashboardStats } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'
import { Download, FileText, TrendingUp, DollarSign } from 'lucide-react'

export default function ReportsPage() {
  const stats = getDashboardStats()

  const monthlyData = [
    { month: 'Jan', revenue: 3000, expenses: 1200, vat: 600, cis: 300 },
    { month: 'Feb', revenue: 4800, expenses: 1500, vat: 960, cis: 450 },
    { month: 'Mar', revenue: 2160, expenses: 800, vat: 432, cis: 200 },
  ]

  const vatSummary = {
    sales: mockInvoices.filter(i => i.type === 'SALES' && i.status === 'PAID'),
    purchases: mockInvoices.filter(i => i.type === 'PURCHASE' && i.status === 'PAID'),
    totalOutputVAT: mockInvoices
      .filter(i => i.type === 'SALES' && i.status === 'PAID')
      .reduce((sum, i) => sum + i.vatAmount, 0),
    totalInputVAT: mockInvoices
      .filter(i => i.type === 'PURCHASE' && i.status === 'PAID')
      .reduce((sum, i) => sum + i.vatAmount, 0),
  }

  const cisSummary = {
    totalDeductions: stats.totalCISDeductions,
    contractors: mockTimesheets.filter(t => t.cisDeduction > 0).length,
    verified: mockTimesheets.filter(t => t.cisDeduction > 0 && t.cisDeduction / t.grossAmount === 0.20).length,
    unverified: mockTimesheets.filter(t => t.cisDeduction > 0 && t.cisDeduction / t.grossAmount === 0.30).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-gray-500 mt-1">
            Financial reports, VAT returns, and CIS summaries
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(stats.totalRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">From paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-600">{formatCurrency(stats.totalExpenses)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Paid to subcontractors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Profit</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{formatCurrency(stats.netProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Revenue minus expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profit Margin</CardDescription>
            <CardTitle className="text-2xl">
              {stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Current margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Profit & Loss */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Profit & Loss
                </CardTitle>
                <CardDescription>Income statement summary</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Revenue (Sales)</span>
                <span className="text-green-600 font-bold">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Direct Costs</span>
                <span className="text-red-600 font-bold">({formatCurrency(stats.totalExpenses)})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-lg">Gross Profit</span>
                <span className="text-blue-600 font-bold text-lg">{formatCurrency(stats.netProfit)}</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Operating Expenses</span>
                  <span>£0.00</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium text-lg">Net Profit</span>
                  <span className="text-blue-600 font-bold text-lg">{formatCurrency(stats.netProfit)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VAT Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  VAT Summary
                </CardTitle>
                <CardDescription>Current quarter VAT position</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Output VAT (Sales)</span>
                <span className="font-bold">{formatCurrency(vatSummary.totalOutputVAT)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Input VAT (Purchases)</span>
                <span className="font-bold">({formatCurrency(vatSummary.totalInputVAT)})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b bg-blue-50 -mx-2 px-2 py-2 rounded">
                <span className="font-medium text-lg">VAT to Pay/Reclaim</span>
                <span className="text-blue-600 font-bold text-lg">
                  {formatCurrency(vatSummary.totalOutputVAT - vatSummary.totalInputVAT)}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sales Invoices</span>
                  <span>{vatSummary.sales.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Purchase Invoices</span>
                  <span>{vatSummary.purchases.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CIS Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  CIS Deductions
                </CardTitle>
                <CardDescription>Monthly CIS return summary</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Total CIS Deducted</span>
                <span className="text-red-600 font-bold">{formatCurrency(cisSummary.totalDeductions)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Number of Contractors</span>
                <span className="font-bold">{cisSummary.contractors}</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verified (20%)</span>
                  <span>{cisSummary.verified} contractors</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unverified (30%)</span>
                  <span>{cisSummary.unverified} contractors</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Cash Flow
                </CardTitle>
                <CardDescription>Monthly cash flow summary</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.map((month) => (
                <div key={month.month} className="flex justify-between items-center pb-3 border-b last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium">{month.month} 2024</span>
                    <span className="text-xs text-gray-500">
                      Net: {formatCurrency(month.revenue - month.expenses)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-green-600">{formatCurrency(month.revenue)}</div>
                      <div className="text-xs text-gray-500">In</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-600">{formatCurrency(month.expenses)}</div>
                      <div className="text-xs text-gray-500">Out</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
