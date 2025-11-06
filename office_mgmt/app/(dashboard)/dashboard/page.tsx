'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getDashboardStats, getRecentActivity, mockInvoices, mockTimesheets } from '@/lib/mock-data'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PoundSterling,
  FileText,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react'

export default function DashboardPage() {
  const stats = getDashboardStats()
  const recentActivity = getRecentActivity()

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: '+12.5%',
      isPositive: true,
      icon: PoundSterling,
      description: 'From paid invoices',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(stats.netProfit),
      change: '+8.2%',
      isPositive: true,
      icon: TrendingUp,
      description: 'Revenue minus expenses',
    },
    {
      title: 'Outstanding Invoices',
      value: formatCurrency(stats.outstandingInvoices),
      count: mockInvoices.filter(i => i.type === 'SALES' && i.status !== 'PAID' && i.status !== 'CANCELLED').length,
      icon: FileText,
      description: 'Awaiting payment',
    },
    {
      title: 'Overdue Amount',
      value: formatCurrency(stats.overdueInvoices),
      count: mockInvoices.filter(i => i.status === 'OVERDUE').length,
      icon: AlertCircle,
      description: 'Past due date',
      isNegative: true,
    },
    {
      title: 'Pending Timesheets',
      value: stats.pendingTimesheets.toString(),
      description: 'Awaiting approval',
      icon: Clock,
    },
    {
      title: 'VAT Collected',
      value: formatCurrency(stats.totalVATCollected),
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
                {stat.change && (
                  <div className="flex items-center text-xs mt-1">
                    {stat.isPositive ? (
                      <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={stat.isPositive ? 'text-green-500' : 'text-red-500'}>
                      {stat.change}
                    </span>
                    <span className="text-gray-500 ml-1">from last month</span>
                  </div>
                )}
                {stat.description && !stat.change && (
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
              {mockInvoices.slice(0, 5).map((invoice) => (
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
              ))}
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
              {mockTimesheets.map((timesheet) => (
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
              ))}
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
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                </div>
                {activity.amount && (
                  <span className="text-sm font-medium">{formatCurrency(activity.amount)}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
