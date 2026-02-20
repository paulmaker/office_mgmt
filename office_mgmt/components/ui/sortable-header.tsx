'use client'

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortConfig } from '@/lib/sort-utils'

interface SortableHeaderProps {
  column: string
  label: string
  sortConfig: SortConfig | null
  onSort: (column: string) => void
  className?: string
}

export function SortableHeader({ column, label, sortConfig, onSort, className }: SortableHeaderProps) {
  const isActive = sortConfig?.column === column
  const direction = isActive ? sortConfig.direction : null

  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-gray-500 select-none cursor-pointer hover:text-gray-900 transition-colors',
        className
      )}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {direction === 'asc' ? (
          <ChevronUp className="h-4 w-4 text-blue-600" />
        ) : direction === 'desc' ? (
          <ChevronDown className="h-4 w-4 text-blue-600" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
        )}
      </div>
    </th>
  )
}
