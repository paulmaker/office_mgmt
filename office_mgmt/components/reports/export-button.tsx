'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  exportProfitAndLoss,
  exportVATSummary,
  exportCISDeductions,
  exportCashFlow,
  exportAllReports
} from '@/app/actions/reports'

type ReportType = 'profit-loss' | 'vat' | 'cis' | 'cash-flow' | 'all'

interface ExportButtonProps {
  reportType: ReportType
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  startDate?: Date
  endDate?: Date
  children?: React.ReactNode
}

export function ExportButton({ 
  reportType, 
  variant = 'outline', 
  size = 'sm',
  startDate,
  endDate,
  children 
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    setIsExporting(true)
    try {
      let csv: string
      let filename: string

      switch (reportType) {
        case 'profit-loss':
          csv = await exportProfitAndLoss(startDate, endDate)
          filename = `profit-and-loss-${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'vat':
          csv = await exportVATSummary(startDate, endDate)
          filename = `vat-summary-${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'cis':
          csv = await exportCISDeductions(startDate, endDate)
          filename = `cis-deductions-${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'cash-flow':
          csv = await exportCashFlow(startDate, endDate)
          filename = `cash-flow-${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'all':
          csv = await exportAllReports()
          filename = `all-reports-${new Date().toISOString().split('T')[0]}.csv`
          break
        default:
          throw new Error('Invalid report type')
      }

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: `Report exported as ${filename}`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export report',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : (children || 'Export')}
    </Button>
  )
}
