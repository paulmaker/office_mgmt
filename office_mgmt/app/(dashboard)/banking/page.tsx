'use client'

import { useState, useEffect } from 'react'
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
import { getBankTransactions, deleteBankTransaction, unreconcileTransaction } from '@/app/actions/bank-transactions'
import { formatCurrency, formatDate, formatCurrencyForCSV } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Upload, Download, Check, X, ArrowDownIcon, ArrowUpIcon, Edit, Trash2, FileText, Calendar } from 'lucide-react'
import { CSVImportDialog } from '@/components/banking/csv-import-dialog'
import { ReconcileDialog } from '@/components/banking/reconcile-dialog'
import type { BankTransaction } from '@prisma/client'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'

type BankTransactionWithRelations = BankTransaction & {
  invoice?: {
    id: string
    invoiceNumber: string
    client?: {
      name: string
      companyName: string | null
    } | null
  } | null
}

type DateRangePreset = 'all' | 'this_week' | 'last_week' | 'last_two_weeks'

export default function BankingPage() {
  const [transactions, setTransactions] = useState<BankTransactionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all')
  const [dateRange, setDateRange] = useState<DateRangePreset>('all')
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadTransactions()
  }, [filter, dateRange])

  const getDateRangeBounds = (): { startDate?: Date; endDate?: Date } => {
    const now = new Date()
    if (dateRange === 'all') return {}
    if (dateRange === 'this_week') {
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      }
    }
    if (dateRange === 'last_week') {
      const lastWeek = subWeeks(now, 1)
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      }
    }
    if (dateRange === 'last_two_weeks') {
      const twoWeeksAgo = subWeeks(now, 2)
      return {
        startDate: startOfWeek(twoWeeksAgo, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      }
    }
    return {}
  }

  const loadTransactions = async () => {
    try {
      setIsLoading(true)
      const filters: any = {}
      if (filter === 'reconciled') {
        filters.reconciled = true
      } else if (filter === 'unreconciled') {
        filters.reconciled = false
      }
      const { startDate, endDate } = getDateRangeBounds()
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      const data = await getBankTransactions(filters)
      setTransactions(data as BankTransactionWithRelations[])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load transactions',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReconcile = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction)
    setReconcileDialogOpen(true)
  }

  const handleUnreconcile = async (id: string) => {
    try {
      await unreconcileTransaction(id)
      await loadTransactions()
      toast({
        variant: 'success',
        title: 'Transaction unreconciled',
        description: 'Transaction has been unreconciled.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unreconcile transaction',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteBankTransaction(id)
      await loadTransactions()
      toast({
        variant: 'success',
        title: 'Transaction deleted',
        description: 'Transaction has been successfully deleted.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete transaction',
      })
    } finally {
      setDeleteDialogOpen(false)
      setDeletingTransactionId(null)
    }
  }

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No data to export',
        description: 'There are no transactions to export. Adjust filters or import data first.',
      })
      return
    }
    const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v)
    const header = 'Date Received,Payment,Description,Money In,Money Out,Reconciled,Invoice,Notes'
    const rows = transactions.map((t) => {
      const date = formatDate(t.date)
      const [payment, desc] = t.description.includes(' - ') ? t.description.split(' - ', 2) : [t.description, t.category ?? '']
      const moneyIn = t.type === 'CREDIT' ? formatCurrencyForCSV(t.amount) : ''
      const moneyOut = t.type === 'DEBIT' ? formatCurrencyForCSV(t.amount) : ''
      const reconciled = t.reconciled ? 'Yes' : 'No'
      const invoice = t.invoice?.invoiceNumber ?? ''
      const notes = t.notes ?? ''
      return [date, payment, desc, moneyIn, moneyOut, reconciled, invoice, notes].map(escape).join(',')
    })
    const csv = [header, ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bank-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: `${transactions.length} transaction(s) exported` })
  }

  const stats = {
    totalIn: transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0),
    totalOut: transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    reconciled: transactions.filter(t => t.reconciled).length,
    unreconciled: transactions.filter(t => !t.reconciled).length,
    balance: transactions.reduce((sum, t) => sum + (t.type === 'CREDIT' ? t.amount : -Math.abs(t.amount)), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-gray-500 mt-1">
            Upload bank export, then reconcile week by week: match payments received to invoices, wages to timesheets, and business expenses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total In</CardDescription>
            <div className="flex items-center gap-2">
              <ArrowDownIcon className="h-4 w-4 text-green-600" />
              <CardTitle className="text-2xl text-green-600">{formatCurrency(stats.totalIn)}</CardTitle>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Out</CardDescription>
            <div className="flex items-center gap-2">
              <ArrowUpIcon className="h-4 w-4 text-red-600" />
              <CardTitle className="text-2xl text-red-600">{formatCurrency(stats.totalOut)}</CardTitle>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Balance</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.balance)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reconciled</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.reconciled}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unreconciled</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.unreconciled}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Week / date range */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Show:</span>
        {(['all', 'this_week', 'last_week', 'last_two_weeks'] as const).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            onClick={() => setDateRange(range)}
            size="sm"
          >
            {range === 'all' ? 'All dates' : range === 'this_week' ? 'This week' : range === 'last_week' ? 'Last week' : 'Last 2 weeks'}
          </Button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filter === 'reconciled' ? 'default' : 'outline'}
          onClick={() => setFilter('reconciled')}
          size="sm"
        >
          Reconciled
        </Button>
        <Button
          variant={filter === 'unreconciled' ? 'default' : 'outline'}
          onClick={() => setFilter('unreconciled')}
          size="sm"
        >
          Unreconciled
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-gray-500">{formatDate(txn.date)}</TableCell>
                    <TableCell className="font-medium">{txn.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {txn.category || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {txn.invoice ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-mono text-blue-600">
                            {txn.invoice.invoiceNumber}
                          </span>
                          {txn.invoice.client && (
                            <span className="text-xs text-gray-500">
                              {txn.invoice.client.companyName || txn.invoice.client.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={txn.type === 'CREDIT' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      {txn.reconciled ? (
                        <Badge variant="success">
                          <Check className="h-3 w-3 mr-1" />
                          Reconciled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!txn.reconciled ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReconcile(txn)}
                          >
                            Match
                          </Button>
                        ) : (
                          <>
                            {txn.documentUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (txn.documentUrl) {
                                    window.open(txn.documentUrl, '_blank')
                                  }
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReconcile(txn)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnreconcile(txn.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {!txn.reconciled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingTransactionId(txn.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onSuccess={loadTransactions}
      />

      {/* Reconcile Dialog */}
      <ReconcileDialog
        open={reconcileDialogOpen}
        onOpenChange={setReconcileDialogOpen}
        transaction={selectedTransaction}
        onSuccess={() => {
          loadTransactions()
          setSelectedTransaction(null)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bank transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingTransactionId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTransactionId) {
                  handleDelete(deletingTransactionId)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
