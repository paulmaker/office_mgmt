'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mockInvoices, mockClients, mockSubcontractors } from '@/lib/mock-data'
import { formatCurrency, formatDate, getInvoiceStatusColor } from '@/lib/utils'
import { Plus, Search, Download, Eye, Mail } from 'lucide-react'

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'sales') return matchesSearch && invoice.type === 'SALES'
    if (activeTab === 'purchase') return matchesSearch && invoice.type === 'PURCHASE'
    if (activeTab === 'overdue') return matchesSearch && invoice.status === 'OVERDUE'

    return matchesSearch
  })

  const getClientName = (invoice: typeof mockInvoices[0]) => {
    if (invoice.clientId) {
      const client = mockClients.find(c => c.id === invoice.clientId)
      return client?.companyName || client?.name || 'Unknown'
    }
    if (invoice.subcontractorId) {
      const sub = mockSubcontractors.find(s => s.id === invoice.subcontractorId)
      return sub?.name || 'Unknown'
    }
    return 'Unknown'
  }

  const stats = {
    total: mockInvoices.length,
    sales: mockInvoices.filter(i => i.type === 'SALES').length,
    purchase: mockInvoices.filter(i => i.type === 'PURCHASE').length,
    overdue: mockInvoices.filter(i => i.status === 'OVERDUE').length,
    totalValue: mockInvoices.reduce((sum, i) => sum + i.total, 0),
    outstanding: mockInvoices.filter(i => i.status !== 'PAID' && i.type === 'SALES').reduce((sum, i) => sum + i.total, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-gray-500 mt-1">
            Manage sales and purchase invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sales Invoices</CardDescription>
            <CardTitle className="text-3xl">{stats.sales}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.outstanding)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.overdue}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex gap-4 border-b mb-4">
              <Tabs.Trigger
                value="all"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                All Invoices
              </Tabs.Trigger>
              <Tabs.Trigger
                value="sales"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Sales
              </Tabs.Trigger>
              <Tabs.Trigger
                value="purchase"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Purchase
              </Tabs.Trigger>
              <Tabs.Trigger
                value="overdue"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-600"
              >
                Overdue
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          <CardDescription>
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client/Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.type === 'SALES' ? 'default' : 'secondary'}>
                      {invoice.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getClientName(invoice)}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(invoice.date)}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === 'PAID' ? 'success' :
                        invoice.status === 'OVERDUE' ? 'destructive' :
                        invoice.status === 'SENT' ? 'default' :
                        'secondary'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.type === 'SALES' && invoice.status !== 'PAID' && (
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
