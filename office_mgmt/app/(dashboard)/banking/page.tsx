'use client'

import { useState } from 'react'
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
import { mockBankTransactions, mockInvoices } from '@/lib/mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Upload, Download, Check, X, ArrowDownIcon, ArrowUpIcon } from 'lucide-react'

export default function BankingPage() {
  const [filter, setFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all')

  const filteredTransactions = mockBankTransactions.filter(txn => {
    if (filter === 'reconciled') return txn.reconciled
    if (filter === 'unreconciled') return !txn.reconciled
    return true
  })

  const getInvoiceNumber = (txn: typeof mockBankTransactions[0]) => {
    if (txn.invoiceId) {
      const invoice = mockInvoices.find(inv => inv.id === txn.invoiceId)
      return invoice?.invoiceNumber
    }
    return null
  }

  const stats = {
    totalIn: mockBankTransactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0),
    totalOut: mockBankTransactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    reconciled: mockBankTransactions.filter(t => t.reconciled).length,
    unreconciled: mockBankTransactions.filter(t => !t.reconciled).length,
    balance: mockBankTransactions.reduce((sum, t) => sum + t.amount, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-gray-500 mt-1">
            Match transactions with invoices and payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
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
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
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
              {filteredTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-gray-500">{formatDate(txn.date)}</TableCell>
                  <TableCell className="font-medium">{txn.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {txn.category || 'Uncategorized'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getInvoiceNumber(txn) ? (
                      <span className="text-sm font-mono text-blue-600">
                        {getInvoiceNumber(txn)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={txn.type === 'CREDIT' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {txn.type === 'CREDIT' ? '+' : ''}{formatCurrency(txn.amount)}
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
                    {!txn.reconciled && (
                      <Button variant="ghost" size="sm">
                        Match
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
