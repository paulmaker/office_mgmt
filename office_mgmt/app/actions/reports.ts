'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
import { requireModule } from '@/lib/module-access'
import { formatCurrency, formatDate } from '@/lib/utils'
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns'

/**
 * Helper to check permissions and get entity context
 */
async function getReportContext() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const entityId = (session.user as any).entityId

  // Check module access
  await requireModule(entityId, 'reports')

  // Check permission
  const canRead = await hasPermission(userId, 'reports', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view reports')
  }

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    throw new Error('No accessible entities')
  }

  return { userId, entityId, entityIds }
}

/**
 * UTF-8 BOM so Excel/Windows treats the file as UTF-8 (prevents "Â£" instead of "£")
 */
const UTF8_BOM = '\uFEFF'

/**
 * Generate CSV content from data rows
 */
function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const csvRows: string[] = []

  // Add headers
  csvRows.push(headers.map(h => `"${h}"`).join(','))

  // Add data rows
  rows.forEach(row => {
    csvRows.push(row.map(cell => {
      const cellStr = String(cell)
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(','))
  })

  return UTF8_BOM + csvRows.join('\n')
}

/**
 * Export Profit & Loss report as CSV
 */
export async function exportProfitAndLoss(startDate?: Date, endDate?: Date) {
  const { entityId } = await getReportContext()

  const now = new Date()
  const start = startDate || new Date(0) // All time if not specified
  const end = endDate || now

  // Fetch data
  const [salesRevenue, purchaseExpenses, timesheetExpenses] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { 
        entityId, 
        type: 'SALES', 
        status: 'PAID',
        date: { gte: start, lte: end }
      }
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { 
        entityId, 
        type: 'PURCHASE', 
        status: 'PAID',
        date: { gte: start, lte: end }
      }
    }),
    prisma.timesheet.aggregate({
      _sum: { grossAmount: true },
      where: { 
        entityId, 
        status: 'PAID',
        periodEnd: { gte: start, lte: end }
      }
    })
  ])

  const totalRevenue = salesRevenue._sum.total || 0
  const totalExpenses = (purchaseExpenses._sum.total || 0) + (timesheetExpenses._sum.grossAmount || 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00'

  const headers = ['Item', 'Amount']
  const rows = [
    ['Revenue (Sales)', formatCurrency(totalRevenue)],
    ['Direct Costs (Purchases)', formatCurrency(purchaseExpenses._sum.total || 0)],
    ['Direct Costs (Timesheets)', formatCurrency(timesheetExpenses._sum.grossAmount || 0)],
    ['Total Direct Costs', formatCurrency(totalExpenses)],
    ['Gross Profit', formatCurrency(netProfit)],
    ['Operating Expenses', formatCurrency(0)],
    ['Net Profit', formatCurrency(netProfit)],
    ['Profit Margin (%)', `${profitMargin}%`]
  ]

  const csv = generateCSV(headers, rows)
  return csv
}

/**
 * Export VAT Summary report as CSV
 */
export async function exportVATSummary(startDate?: Date, endDate?: Date) {
  const { entityId } = await getReportContext()

  const now = new Date()
  const start = startDate || startOfMonth(subMonths(now, 2)) // Default to current quarter
  const end = endDate || now

  // Fetch data
  const [vatSales, vatPurchases] = await Promise.all([
    prisma.invoice.findMany({
      where: { 
        entityId, 
        type: 'SALES', 
        status: 'PAID',
        date: { gte: start, lte: end }
      },
      select: { 
        invoiceNumber: true, 
        date: true, 
        total: true, 
        vatAmount: true,
        client: { select: { name: true, companyName: true } }
      }
    }),
    prisma.invoice.findMany({
      where: { 
        entityId, 
        type: 'PURCHASE', 
        status: 'PAID',
        date: { gte: start, lte: end }
      },
      select: { 
        invoiceNumber: true, 
        date: true, 
        total: true, 
        vatAmount: true,
        supplier: { select: { name: true, companyName: true } }
      }
    })
  ])

  const totalOutputVAT = vatSales.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0)
  const totalInputVAT = vatPurchases.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0)
  const vatToPay = totalOutputVAT - totalInputVAT

  const headers = ['Type', 'Invoice Number', 'Date', 'Customer/Supplier', 'Total', 'VAT Amount']
  const rows: (string | number)[][] = []

  // Add summary row
  rows.push(['SUMMARY', '', '', '', '', ''])
  rows.push(['Output VAT (Sales)', '', '', '', '', formatCurrency(totalOutputVAT)])
  rows.push(['Input VAT (Purchases)', '', '', '', '', formatCurrency(totalInputVAT)])
  rows.push(['VAT to Pay/Reclaim', '', '', '', '', formatCurrency(vatToPay)])
  rows.push(['', '', '', '', '', ''])

  // Add sales invoices
  rows.push(['SALES INVOICES', '', '', '', '', ''])
  vatSales.forEach(inv => {
    const customerName = inv.client?.companyName || inv.client?.name || 'N/A'
    rows.push([
      'Sales',
      inv.invoiceNumber,
      formatDate(inv.date),
      customerName,
      formatCurrency(inv.total),
      formatCurrency(inv.vatAmount || 0)
    ])
  })

  rows.push(['', '', '', '', '', ''])

  // Add purchase invoices
  rows.push(['PURCHASE INVOICES', '', '', '', '', ''])
  vatPurchases.forEach(inv => {
    const supplierName = inv.supplier?.companyName || inv.supplier?.name || 'N/A'
    rows.push([
      'Purchase',
      inv.invoiceNumber,
      formatDate(inv.date),
      supplierName,
      formatCurrency(inv.total),
      formatCurrency(inv.vatAmount || 0)
    ])
  })

  const csv = generateCSV(headers, rows)
  return csv
}

/**
 * Export CIS Deductions report as CSV
 */
export async function exportCISDeductions(startDate?: Date, endDate?: Date) {
  const { entityId } = await getReportContext()

  const now = new Date()
  const start = startDate || new Date(0) // All time if not specified
  const end = endDate || now

  // Fetch timesheets with CIS deductions
  const timesheets = await prisma.timesheet.findMany({
    where: { 
      entityId, 
      status: 'PAID', 
      cisDeduction: { gt: 0 },
      periodEnd: { gte: start, lte: end }
    },
    include: { 
      subcontractor: true 
    },
    orderBy: { periodEnd: 'desc' }
  })

  const totalCISDeductions = timesheets.reduce((sum, t) => sum + t.cisDeduction, 0)

  const headers = [
    'Period End', 
    'Subcontractor', 
    'Gross Amount', 
    'CIS Deduction', 
    'Net Amount',
    'CIS Rate (%)'
  ]
  const rows: (string | number)[][] = []

  // Add summary
  rows.push(['SUMMARY', '', '', '', '', ''])
  rows.push(['Total CIS Deducted', '', '', formatCurrency(totalCISDeductions), '', ''])
  rows.push(['Number of Timesheets', '', '', timesheets.length.toString(), '', ''])
  rows.push(['', '', '', '', '', ''])

  // Add timesheet details
  rows.push(['TIMESHEET DETAILS', '', '', '', '', ''])
  timesheets.forEach(ts => {
    const subcontractorName = ts.subcontractor?.name || 'N/A'
    const cisRate = ts.grossAmount > 0 ? ((ts.cisDeduction / ts.grossAmount) * 100).toFixed(1) : '0'
    const netAmount = ts.grossAmount - ts.cisDeduction

    rows.push([
      formatDate(ts.periodEnd),
      subcontractorName,
      formatCurrency(ts.grossAmount),
      formatCurrency(ts.cisDeduction),
      formatCurrency(netAmount),
      `${cisRate}%`
    ])
  })

  const csv = generateCSV(headers, rows)
  return csv
}

/**
 * Export Cash Flow report as CSV
 */
export async function exportCashFlow(startDate?: Date, endDate?: Date) {
  const { entityId } = await getReportContext()

  const now = new Date()
  const start = startDate || startOfMonth(subMonths(now, 5)) // Default to last 6 months
  const end = endDate || now

  // Fetch data
  const [monthlySales, monthlyPurchases, monthlyTimesheets] = await Promise.all([
    prisma.invoice.findMany({
      where: { 
        entityId, 
        type: 'SALES', 
        status: 'PAID',
        date: { gte: start, lte: end }
      },
      select: { date: true, total: true }
    }),
    prisma.invoice.findMany({
      where: { 
        entityId, 
        type: 'PURCHASE', 
        status: 'PAID',
        date: { gte: start, lte: end }
      },
      select: { date: true, total: true }
    }),
    prisma.timesheet.findMany({
      where: { 
        entityId, 
        status: 'PAID',
        periodEnd: { gte: start, lte: end }
      },
      select: { periodEnd: true, grossAmount: true }
    })
  ])

  // Create monthly map
  const monthlyDataMap = new Map<string, { revenue: number, expenses: number }>()
  
  // Initialize all months in range
  let current = new Date(start)
  while (current <= end) {
    const key = format(current, 'MMM yyyy')
    monthlyDataMap.set(key, { revenue: 0, expenses: 0 })
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
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

  // Convert to array and sort
  const monthlyData = Array.from(monthlyDataMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => {
      const dateA = new Date(a.month)
      const dateB = new Date(b.month)
      return dateA.getTime() - dateB.getTime()
    })

  const headers = ['Month', 'Revenue (In)', 'Expenses (Out)', 'Net Cash Flow']
  const rows: (string | number)[][] = []

  let totalRevenue = 0
  let totalExpenses = 0

  monthlyData.forEach(month => {
    const net = month.revenue - month.expenses
    totalRevenue += month.revenue
    totalExpenses += month.expenses
    rows.push([
      month.month,
      formatCurrency(month.revenue),
      formatCurrency(month.expenses),
      formatCurrency(net)
    ])
  })

  // Add totals
  rows.push(['', '', '', ''])
  rows.push([
    'TOTAL',
    formatCurrency(totalRevenue),
    formatCurrency(totalExpenses),
    formatCurrency(totalRevenue - totalExpenses)
  ])

  const csv = generateCSV(headers, rows)
  return csv
}

/**
 * Export all reports as a combined CSV
 */
export async function exportAllReports() {
  const { entityId } = await getReportContext()

  const now = new Date()
  const quarterStart = startOfMonth(subMonths(now, 2))
  const sixMonthsAgo = startOfMonth(subMonths(now, 5))

  const [profitLoss, vatSummary, cisDeductions, cashFlow] = await Promise.all([
    exportProfitAndLoss(),
    exportVATSummary(quarterStart, now),
    exportCISDeductions(),
    exportCashFlow(sixMonthsAgo, now)
  ])

  // Combine all reports with headers
  const combined = [
    '='.repeat(80),
    'PROFIT & LOSS REPORT',
    '='.repeat(80),
    profitLoss,
    '',
    '='.repeat(80),
    'VAT SUMMARY REPORT',
    '='.repeat(80),
    vatSummary,
    '',
    '='.repeat(80),
    'CIS DEDUCTIONS REPORT',
    '='.repeat(80),
    cisDeductions,
    '',
    '='.repeat(80),
    'CASH FLOW REPORT',
    '='.repeat(80),
    cashFlow,
    '',
    `Generated: ${formatDate(now)}`
  ].join('\n')

  return combined
}
