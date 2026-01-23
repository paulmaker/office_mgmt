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
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    // Skip header row if it exists
    const dataLines = lines.slice(1)
    
    return dataLines.map(line => {
      // Handle CSV with commas or tabs
      const delimiter = line.includes('\t') ? '\t' : ','
      const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''))
      
      // Expected format: Date, Description, Amount, Type (CREDIT/DEBIT), Category (optional)
      // Amount can be positive or negative
      const date = parts[0] || ''
      const description = parts[1] || ''
      const amountStr = parts[2] || '0'
      const typeStr = parts[3]?.toUpperCase() || ''
      const category = parts[4] || undefined

      // Parse amount - handle negative values
      let amount = parseFloat(amountStr.replace(/[£,\s]/g, ''))
      let type: TransactionType = typeStr === 'CREDIT' ? 'CREDIT' : 'DEBIT'
      
      // If amount is negative, it's a debit; if positive, it's a credit
      // But also check the type field if provided
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
          <DialogTitle>Import Bank Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with bank transactions. Expected format: Date, Description, Amount, Type (CREDIT/DEBIT), Category (optional)
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
            <p className="font-medium mb-1">CSV Format:</p>
            <p>Date, Description, Amount, Type, Category</p>
            <p className="mt-2">Example:</p>
            <p className="font-mono">2024-01-15, Payment from Client ABC, 1500.00, CREDIT, Invoice Payment</p>
            <p className="font-mono">2024-01-16, Supplier Payment, -500.00, DEBIT, Expenses</p>
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
