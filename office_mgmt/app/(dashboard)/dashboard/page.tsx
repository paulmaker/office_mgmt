import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PoundSterling,
  FileText,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.entityId) {
    redirect('/login')
  }

  const entityId = session.user.entityId

  // Calculate start of current quarter for VAT
  const now = new Date()
  const currentQuarter = Math.floor((now.getMonth() + 3) / 3)
  const quarterStartMonth = (currentQuarter - 1) * 3
  const quarterStartDate = new Date(now.getFullYear(), quarterStartMonth, 1)

  // Fetch all data in parallel
  const [
    salesRevenue,
    purchaseExpenses,
    timesheetExpenses,
    outstandingInvoicesSum,
    outstandingInvoicesCount,
    overdueInvoicesSum,
    overdueInvoicesCount,
    pendingTimesheetsCount,
    vatCollected,
    recentInvoices,
    recentTimesheets
  ] = await Promise.all([
    // Total Revenue (Paid Sales Invoices)
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { entityId, type: 'SALES', status: 'PAID' }
    }),
    // Purchase Expenses (Paid Purchase Invoices)
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { entityId, type: 'PURCHASE', status: 'PAID' }
    }),
    // Timesheet Expenses (Paid Timesheets)
    prisma.timesheet.aggregate({
      _sum: { grossAmount: true },
      where: { entityId, status: 'PAID' }
    }),
    // Outstanding Invoices (Sales, not PAID or CANCELLED)
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { 
        entityId, 
        type: 'SALES', 
        status: { notIn: ['PAID', 'CANCELLED'] } 
      }
    }),
    prisma.invoice.count({
      where: { 
        entityId, 
        type: 'SALES', 
        status: { notIn: ['PAID', 'CANCELLED'] } 
      }
    }),
    // Overdue Invoices
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { entityId, type: 'SALES', status: 'OVERDUE' }
    }),
    prisma.invoice.count({
      where: { entityId, type: 'SALES', status: 'OVERDUE' }
    }),
    // Pending Timesheets
    prisma.timesheet.count({
      where: { entityId, status: 'SUBMITTED' }
    }),
    // VAT Collected (This Quarter)
    prisma.invoice.aggregate({
      _sum: { vatAmount: true },
      where: { 
        entityId, 
        type: 'SALES', 
        status: 'PAID',
        date: { gte: quarterStartDate }
      }
    }),
    // Recent Invoices
    prisma.invoice.findMany({
      where: { entityId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: true, subcontractor: true, supplier: true }
    }),
    // Recent Timesheets
    prisma.timesheet.findMany({
      where: { entityId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { subcontractor: true }
    })
  ])

  // Process Stats
  const totalRevenue = salesRevenue._sum.total || 0
  const totalExpenses = (purchaseExpenses._sum.total || 0) + (timesheetExpenses._sum.grossAmount || 0)
  const netProfit = totalRevenue - totalExpenses
  const outstandingAmount = outstandingInvoicesSum._sum.total || 0
  const overdueAmount = overdueInvoicesSum._sum.total || 0
  const currentQuarterVAT = vatCollected._sum.vatAmount || 0

  // Construct Recent Activity
  const recentActivity = [
    ...recentInvoices.map(inv => ({
      id: `inv-${inv.id}`,
      type: inv.type === 'SALES' ? 'invoice_sent' : 'purchase_invoice',
      description: `${inv.type === 'SALES' ? 'Sales' : 'Purchase'} Invoice ${inv.invoiceNumber} - ${inv.status}`,
      date: inv.updatedAt,
      amount: inv.total,
    })),
    ...recentTimesheets.map(ts => ({
      id: `ts-${ts.id}`,
      type: 'timesheet',
      description: `Timesheet ${ts.status} - ${ts.subcontractor.name}`,
      date: ts.updatedAt,
      amount: ts.netAmount,
    }))
  ]
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .slice(0, 10)

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      // change: '+12.5%', // TODO: Calculate change from previous period
      isPositive: true,
      icon: PoundSterling,
      description: 'From paid invoices',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(netProfit),
      // change: '+8.2%', // TODO: Calculate change
      isPositive: netProfit >= 0,
      icon: TrendingUp,
      description: 'Revenue minus expenses',
    },
    {
      title: 'Outstanding Invoices',
      value: formatCurrency(outstandingAmount),
      count: outstandingInvoicesCount,
      icon: FileText,
      description: 'Awaiting payment',
    },
    {
      title: 'Overdue Amount',
      value: formatCurrency(overdueAmount),
      count: overdueInvoicesCount,
      icon: AlertCircle,
      description: 'Past due date',
      isNegative: true,
    },
    {
      title: 'Pending Timesheets',
      value: pendingTimesheetsCount.toString(),
      description: 'Awaiting approval',
      icon: Clock,
    },
    {
      title: 'VAT Collected',
      value: formatCurrency(currentQuarterVAT),
      description: 'This quarter',
      icon: PoundSterling,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.isNegative ? 'text-red-500' : 'text-gray-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.count !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.count} invoice{stat.count !== 1 ? 's' : ''}
                  </p>
                )}
                {/* Change indicator removed until we implement historical comparison */}
                {stat.description && (
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Latest sales and purchase invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent invoices</p>
              ) : (
                recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">
                        {invoice.type === 'SALES' ? 'Sales' : 'Purchase'} • {formatDate(invoice.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(invoice.total)}</span>
                      <Badge
                        variant={
                          invoice.status === 'PAID' ? 'success' :
                          invoice.status === 'OVERDUE' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Timesheets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Timesheets</CardTitle>
            <CardDescription>Latest timesheet submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTimesheets.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent timesheets</p>
              ) : (
                recentTimesheets.map((timesheet) => (
                  <div key={timesheet.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {timesheet.hoursWorked}h @ {formatCurrency(timesheet.rate)}/hr
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(timesheet.netAmount)}</span>
                      <Badge
                        variant={
                          timesheet.status === 'PAID' ? 'success' :
                          timesheet.status === 'APPROVED' ? 'default' :
                          'secondary'
                        }
                      >
                        {timesheet.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest transactions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-medium">{formatCurrency(activity.amount)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
