'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { reconcileTransaction } from '@/app/actions/bank-transactions'
import { getInvoices } from '@/app/actions/invoices'
import { getTimesheets } from '@/app/actions/timesheets'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { PDFUpload } from './pdf-upload'
import type { BankTransaction, Invoice, Timesheet } from '@prisma/client'

interface ReconcileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: BankTransaction | null
  onSuccess?: () => void
}

export function ReconcileDialog({ open, onOpenChange, transaction, onSuccess }: ReconcileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string>('')
  const [documentUrl, setDocumentUrl] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const { toast } = useToast()

  useEffect(() => {
    if (open && transaction) {
      loadData()
      // Pre-select if already linked
      setSelectedInvoiceId(transaction.invoiceId || '')
      setSelectedTimesheetId(transaction.linkedTimesheetId || '')
      setDocumentUrl(transaction.documentUrl || '')
      setNotes(transaction.notes || '')
    }
  }, [open, transaction])

  const loadData = async () => {
    try {
      const [invoicesData, timesheetsData] = await Promise.all([
        getInvoices(),
        getTimesheets(),
      ])
      setInvoices(invoicesData)
      setTimesheets(timesheetsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleSubmit = async () => {
    if (!transaction) return

    setIsSubmitting(true)

    try {
      await reconcileTransaction(transaction.id, {
        invoiceId: selectedInvoiceId || null,
        linkedTimesheetId: selectedTimesheetId || null,
        documentUrl: documentUrl || null,
        notes: notes || undefined,
      })

      toast({
        variant: 'success',
        title: 'Transaction reconciled',
        description: 'Transaction has been successfully reconciled.',
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reconcile transaction',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!transaction) return null

  // Filter invoices/timesheets that match the transaction amount (for suggestions)
  const matchingInvoices = invoices.filter(inv => 
    Math.abs(inv.total - Math.abs(transaction.amount)) < 0.01
  )
  const matchingTimesheets = timesheets.filter(ts => 
    Math.abs(ts.netAmount - Math.abs(transaction.amount)) < 0.01
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconcile Transaction</DialogTitle>
          <DialogDescription>
            Link this transaction to an invoice, timesheet, or document
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Transaction Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium">{new Date(transaction.date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Amount:</span>
                <span className={`ml-2 font-medium ${transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Description:</span>
                <span className="ml-2 font-medium">{transaction.description}</span>
              </div>
            </div>
          </div>

          {/* Invoice Selection */}
          <div className="space-y-2">
            <Label htmlFor="invoice">Link to Invoice (optional)</Label>
            <select
              id="invoice"
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {formatCurrency(invoice.total)} - {invoice.type}
                </option>
              ))}
            </select>
            {matchingInvoices.length > 0 && !selectedInvoiceId && (
              <p className="text-xs text-blue-600">
                💡 {matchingInvoices.length} invoice(s) match this amount
              </p>
            )}
          </div>

          {/* Timesheet Selection */}
          <div className="space-y-2">
            <Label htmlFor="timesheet">Link to Timesheet (optional)</Label>
            <select
              id="timesheet"
              value={selectedTimesheetId}
              onChange={(e) => setSelectedTimesheetId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {timesheets.map((timesheet) => (
                <option key={timesheet.id} value={timesheet.id}>
                  {formatCurrency(timesheet.netAmount)} - {new Date(timesheet.periodStart).toLocaleDateString()}
                </option>
              ))}
            </select>
            {matchingTimesheets.length > 0 && !selectedTimesheetId && (
              <p className="text-xs text-blue-600">
                💡 {matchingTimesheets.length} timesheet(s) match this amount
              </p>
            )}
          </div>

          {/* Document URL (PDF Remittance) */}
          <div className="space-y-2">
            <Label>Remittance Document (optional)</Label>
            <PDFUpload
              value={documentUrl}
              onChange={setDocumentUrl}
              onRemove={() => setDocumentUrl('')}
            />
            <div className="mt-2">
              <Label htmlFor="documentUrl" className="text-xs text-gray-500">
                Or enter URL manually:
              </Label>
              <Input
                id="documentUrl"
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              rows={3}
              placeholder="Additional notes about this reconciliation..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Reconciling...' : 'Reconcile Transaction'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
