'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DateRangeFilterProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onClear: () => void
}

export function DateRangeFilter({ from, to, onFromChange, onToChange, onClear }: DateRangeFilterProps) {
  const hasValue = from || to

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-sm font-medium text-gray-500 whitespace-nowrap">Date range:</label>
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <span className="text-sm text-gray-400">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {hasValue && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 px-2 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
