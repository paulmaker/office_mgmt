import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Download, FileText, TrendingUp, DollarSign } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns'

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user?.entityId) {
    redirect('/login')
  }

  const entityId = session.user.entityId

  // Calculate dates
  const now = new Date()
  const currentQuarter = Math.floor((now.getMonth() + 3) / 3)
  const quarterStartMonth = (currentQuarter - 1) * 3
  const quarterStartDate = new Date(now.getFullYear(), quarterStartMonth, 1)
  const sixMonthsAgo = startOfMonth(subMonths(now, 5))

  // Fetch data in parallel
  const [
    salesRevenue,
    purchaseExpenses,
    timesheetExpenses,
    vatSales,
    vatPurchases,
    cisTimesheets,
    monthlySales,
    monthlyPurchases,
    monthlyTimesheets
  ] = await Promise.all([
    // 1. Total Stats
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { entityId, type: 'SALES', status: 'PAID' }
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { entityId, type: 'PURCHASE', status: 'PAID' }
    }),
    prisma.timesheet.aggregate({
      _sum: { grossAmount: true },
      where: { entityId, status: 'PAID' }
    }),

    // 2. VAT Summary (Current Quarter)
    prisma.invoice.aggregate({
      _sum: { vatAmount: true },
      _count: true,
      where: { 
        entityId, 
        type: 'SALES', 
        status: 'PAID',
        date: { gte: quarterStartDate }
      }
    }),
    prisma.invoice.aggregate({
      _sum: { vatAmount: true },
      _count: true,
      where: { 
        entityId, 
        type: 'PURCHASE', 
        status: 'PAID',
        date: { gte: quarterStartDate }
      }
    }),

    // 3. CIS Summary (All time or current tax year - doing all time for now as per mock)
    prisma.timesheet.findMany({
      where: { entityId, status: 'PAID', cisDeduction: { gt: 0 } },
      include: { subcontractor: true }
    }),

    // 4. Monthly Cash Flow Data (Last 6 months)
    prisma.invoice.findMany({
      where: { 
        entityId, 
        type: 'SALES', 
        status: 'PAID',
        date: { gte: sixMonthsAgo }
      },
      select: { date: true, total: true }
    }),
    prisma.invoice.findMany({
      where: { 
        entityId, 
        type: 'PURCHASE', 
        status: 'PAID',
        date: { gte: sixMonthsAgo }
      },
      select: { date: true, total: true }
    }),
    prisma.timesheet.findMany({
      where: { 
        entityId, 
        status: 'PAID',
        periodEnd: { gte: sixMonthsAgo }
      },
      select: { periodEnd: true, grossAmount: true }
    })
  ])

  // --- Process Financial Stats ---
  const totalRevenue = salesRevenue._sum.total || 0
  const totalExpenses = (purchaseExpenses._sum.total || 0) + (timesheetExpenses._sum.grossAmount || 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'

  // --- Process VAT Summary ---
  const vatSummary = {
    totalOutputVAT: vatSales._sum.vatAmount || 0,
    totalInputVAT: vatPurchases._sum.vatAmount || 0,
    salesCount: vatSales._count,
    purchasesCount: vatPurchases._count
  }

  // --- Process CIS Summary ---
  const totalCISDeductions = cisTimesheets.reduce((sum, t) => sum + t.cisDeduction, 0)
  // Get unique contractors involved in CIS deductions
  const cisContractorIds = new Set(cisTimesheets.map(t => t.subcontractorId))
  const uniqueContractors = cisContractorIds.size
  
  // Count by verification status (based on the subcontractor's current status on the timesheet snapshot if we had it, but here using current sub status)
  // Note: For perfect accuracy we should store the used verification status on the timesheet.
  // Approximation: Count timesheets where deduction implies rate.
  const verifiedCount = cisTimesheets.filter(t => (t.cisDeduction / t.grossAmount) <= 0.20).length
  const unverifiedCount = cisTimesheets.filter(t => (t.cisDeduction / t.grossAmount) > 0.20).length

  // --- Process Monthly Data ---
  // Create map of last 6 months
  const monthlyDataMap = new Map<string, { revenue: number, expenses: number }>()
  
  for (let i = 0; i < 6; i++) {
    const d = subMonths(now, i)
    const key = format(d, 'MMM yyyy')
    monthlyDataMap.set(key, { revenue: 0, expenses: 0 })
  }

  // Aggregate Sales
  monthlySales.forEach(inv => {
    const key = format(inv.date, 'MMM yyyy')
    if (monthlyDataMap.has(key)) {
      const curr = monthlyDataMap.get(key)!
      curr.revenue += inv.total
    }
  })

  // Aggregate Expenses (Purchases + Timesheets)
  monthlyPurchases.forEach(inv => {
    const key = format(inv.date, 'MMM yyyy')
    if (monthlyDataMap.has(key)) {
      const curr = monthlyDataMap.get(key)!
      curr.expenses += inv.total
    }
  })

  monthlyTimesheets.forEach(ts => {
    const key = format(ts.periodEnd, 'MMM yyyy')
    if (monthlyDataMap.has(key)) {
      const curr = monthlyDataMap.get(key)!
      curr.expenses += ts.grossAmount
    }
  })

  // Convert map to array and reverse to show oldest first
  const monthlyData = Array.from(monthlyDataMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .reverse()

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
            <CardTitle className="text-2xl text-green-600">{formatCurrency(totalRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">From paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-600">{formatCurrency(totalExpenses)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Paid to suppliers & subcontractors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Profit</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{formatCurrency(netProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Revenue minus expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profit Margin</CardDescription>
            <CardTitle className="text-2xl">
              {profitMargin}%
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
                <span className="text-green-600 font-bold">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Direct Costs</span>
                <span className="text-red-600 font-bold">({formatCurrency(totalExpenses)})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-lg">Gross Profit</span>
                <span className="text-blue-600 font-bold text-lg">{formatCurrency(netProfit)}</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Operating Expenses</span>
                  <span>£0.00</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium text-lg">Net Profit</span>
                  <span className="text-blue-600 font-bold text-lg">{formatCurrency(netProfit)}</span>
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
                  <span>{vatSummary.salesCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Purchase Invoices</span>
                  <span>{vatSummary.purchasesCount}</span>
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
                <CardDescription>CIS summary (Paid Timesheets)</CardDescription>
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
                <span className="text-red-600 font-bold">{formatCurrency(totalCISDeductions)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Number of Contractors</span>
                <span className="font-bold">{uniqueContractors}</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verified Rate (20%)</span>
                  <span>{verifiedCount} timesheets</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unverified Rate (30%)</span>
                  <span>{unverifiedCount} timesheets</span>
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
                <CardDescription>Last 6 months cash flow</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.length === 0 ? (
                 <p className="text-sm text-gray-500 text-center py-4">No data available for the last 6 months</p>
              ) : (
                monthlyData.map((month) => (
                  <div key={month.month} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <div className="flex flex-col">
                      <span className="font-medium">{month.month}</span>
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
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
