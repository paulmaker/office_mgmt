'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { importBankTransactionsFromCSV } from '@/app/actions/bank-transactions'
import { useToast } from '@/hooks/use-toast'
import { Upload } from 'lucide-react'
import type { TransactionType } from '@prisma/client'

/** Parse a single CSV line respecting quoted fields (commas inside quotes stay) */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if ((c === ',' || c === '\t') && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''))
  return result
}

/** Parse UK bank-style amount e.g. "£12,340.80", "-£520.83"; tolerates encoding issues with £ */
function parseAmount(val: string): number | null {
  if (!val || !val.trim()) return null
  // Strip currency symbols, commas, spaces - keep digits, decimal point, minus
  const cleaned = val.replace(/[^\d.-]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/** Parse date from bank export (e.g. 12/20/2025, 1/2/2026 - MM/DD/YYYY or DD/MM/YYYY) */
function parseBankDate(val: string): string | null {
  if (!val || !val.trim()) return null
  const parts = val.trim().split(/[/-]/)
  if (parts.length !== 3) return null
  const a = parseInt(parts[0], 10)
  const b = parseInt(parts[1], 10)
  const c = parseInt(parts[2], 10)
  if (isNaN(a) || isNaN(b) || isNaN(c)) return null
  // If first part > 12 treat as DD/MM/YYYY; else MM/DD/YYYY
  let month: number
  let day: number
  let year: number
  if (a > 12) {
    day = a
    month = b
    year = c
  } else if (b > 12) {
    month = a
    day = b
    year = c
  } else {
    month = a
    day = b
    year = c
  }
  if (year < 100) year += 2000
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : iso
}

/** Infer category from description for bank export (wages, business expense, etc.) */
function inferCategory(payment: string, description: string): string | undefined {
  const combined = `${payment} ${description}`.toLowerCase()
  if (combined.includes('wages')) return 'Wages'
  if (combined.includes('business expense') || combined.includes('business expense-')) return 'Business Expense'
  if (combined.includes('payment from') || combined.includes('payment of invoice')) return 'Payment Received'
  return undefined
}

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CSVImportDialog({ open, onOpenChange, onSuccess }: CSVImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const parseCSV = (text: string): Array<{
    date: string
    description: string
    amount: number
    type: TransactionType
    category?: string
  }> => {
    const rawLines = text.split(/\r?\n/)
    const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) return []

    const firstRow = parseCSVLine(lines[0])
    const col0 = (firstRow[0] ?? '').replace(/\uFEFF/g, '').toLowerCase()
    const col3 = (firstRow[3] ?? '').toLowerCase()
    const col4 = (firstRow[4] ?? '').toLowerCase()
    const isBankExport =
      firstRow.length >= 5 &&
      (col0.includes('date') || col0 === 'date received') &&
      (col3.includes('money') && col3.includes('in') || col4.includes('money') && col4.includes('out'))

    if (isBankExport) {
      // Client bank export: Date Received, Payment, Description, Money In, Money Out, ...
      const dataLines = lines.slice(1)
      const out: Array<{ date: string; description: string; amount: number; type: TransactionType; category?: string }> = []
      for (const line of dataLines) {
        const parts = parseCSVLine(line)
        const dateReceived = parts[0] ?? ''
        const payment = parts[1] ?? ''
        const description = parts[2] ?? ''
        const moneyIn = parts[3] ?? ''
        const moneyOut = parts[4] ?? ''

        const date = parseBankDate(dateReceived)
        if (!date) continue
        if (!payment.trim() && !description.trim()) continue
        if (payment.toLowerCase().includes('reconcill') || description.toLowerCase().includes('reconcill')) continue

        const inAmount = parseAmount(moneyIn)
        const outAmount = parseAmount(moneyOut)
        const hasIn = inAmount != null && inAmount > 0
        const hasOut = outAmount != null && outAmount > 0

        if (hasIn && !hasOut) {
          out.push({
            date,
            description: description.trim() ? `${payment} - ${description}` : payment,
            amount: inAmount!,
            type: 'CREDIT',
            category: inferCategory(payment, description),
          })
        } else if (hasOut && !hasIn) {
          out.push({
            date,
            description: description.trim() ? `${payment} - ${description}` : payment,
            amount: Math.abs(outAmount!),
            type: 'DEBIT',
            category: inferCategory(payment, description),
          })
        } else if (hasIn && hasOut) {
          out.push({
            date,
            description: description.trim() ? `${payment} - ${description}` : payment,
            amount: inAmount!,
            type: 'CREDIT',
            category: inferCategory(payment, description),
          })
          out.push({
            date,
            description: description.trim() ? `${payment} - ${description}` : payment,
            amount: Math.abs(outAmount!),
            type: 'DEBIT',
            category: inferCategory(payment, description),
          })
        }
      }
      return out.filter(row => row.date && row.description && !isNaN(row.amount) && row.amount > 0)
    }

    // Legacy format: Date, Description, Amount, Type (CREDIT/DEBIT), Category (optional)
    const dataLines = lines.slice(1)
    const delimiter = lines[0].includes('\t') ? '\t' : ','
    return dataLines.map(line => {
      const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''))
      const date = parts[0] || ''
      const description = parts[1] || ''
      const amountStr = parts[2] || '0'
      const typeStr = parts[3]?.toUpperCase() || ''
      const category = parts[4] || undefined

      let amount = parseFloat(amountStr.replace(/[£,\s]/g, ''))
      let type: TransactionType = typeStr === 'CREDIT' ? 'CREDIT' : 'DEBIT'
      if (!typeStr && amount < 0) {
        type = 'DEBIT'
        amount = Math.abs(amount)
      } else if (!typeStr && amount > 0) {
        type = 'CREDIT'
      }

      return {
        date,
        description,
        amount,
        type,
        category,
      }
    }).filter(row => row.date && row.description && !isNaN(row.amount))
  }

  const handleImport = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a CSV file',
      })
      return
    }

    setIsProcessing(true)

    try {
      const text = await file.text()
      const transactions = parseCSV(text)

      if (transactions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No valid transactions found in CSV file',
        })
        setIsProcessing(false)
        return
      }

      await importBankTransactionsFromCSV(transactions)
      
      toast({
        variant: 'success',
        title: 'Import successful',
        description: `Imported ${transactions.length} transaction(s)`,
      })

      setFile(null)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import CSV',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Bank Export (CSV)</DialogTitle>
          <DialogDescription>
            Upload the bank statement export (e.g. copy from online banking into a spreadsheet and save as CSV). Supports the standard bank export format with Date Received, Payment, Description, Money In, Money Out.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            />
            {file && (
              <p className="text-sm text-gray-500">Selected: {file.name}</p>
            )}
          </div>
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
            <p className="font-medium mb-1">Supported format (bank export):</p>
            <p>Date Received, Payment, Description, Money In, Money Out, …</p>
            <p className="mt-2">Paste your online statement into a spreadsheet, save as CSV, then upload here. You can reconcile week by week: match payments received to invoices, wages to timesheets, and business expenses as needed.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setFile(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || isProcessing}>
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
