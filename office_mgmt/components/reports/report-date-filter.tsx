'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { presetToRange } from '@/lib/financial-year'

type Preset = 'this-month' | 'last-month' | 'this-quarter' | 'last-quarter' | 'this-year' | 'last-year'

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'this-quarter', label: 'This Quarter' },
  { key: 'last-quarter', label: 'Last Quarter' },
  { key: 'this-year', label: 'This Year' },
  { key: 'last-year', label: 'Last Year' },
]

interface ReportDateFilterProps {
  financialYearStartMonth?: number
  financialYearStartDay?: number
}

export function ReportDateFilter({
  financialYearStartMonth = 4,
  financialYearStartDay = 1,
}: ReportDateFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentFrom = searchParams.get('from') || ''
  const currentTo = searchParams.get('to') || ''
  const currentPreset = searchParams.get('preset') || ''
  const hasFilter = currentFrom || currentTo

  const fyConfig = useMemo(
    () => ({ startMonth: financialYearStartMonth, startDay: financialYearStartDay }),
    [financialYearStartMonth, financialYearStartDay]
  )

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const handlePreset = useCallback(
    (preset: Preset) => {
      const { from, to } = presetToRange(preset, fyConfig)
      updateParams({ from, to, preset })
    },
    [updateParams, fyConfig]
  )

  const handleClear = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  const dateLabel = useMemo(() => {
    if (!hasFilter) return null
    const fromDisplay = currentFrom ? format(new Date(currentFrom + 'T00:00:00'), 'dd MMM yyyy') : '...'
    const toDisplay = currentTo ? format(new Date(currentTo + 'T00:00:00'), 'dd MMM yyyy') : '...'
    return `${fromDisplay} — ${toDisplay}`
  }, [hasFilter, currentFrom, currentTo])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map(({ key, label }) => (
          <Button
            key={key}
            variant={currentPreset === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePreset(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm font-medium text-gray-500 whitespace-nowrap">Custom range:</label>
        <input
          type="date"
          value={currentFrom}
          onChange={(e) => updateParams({ from: e.target.value, preset: '' })}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          value={currentTo}
          onChange={(e) => updateParams({ to: e.target.value, preset: '' })}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-9 px-2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {dateLabel && (
        <p className="text-sm text-gray-500">
          Showing data for: <span className="font-medium text-gray-700">{dateLabel}</span>
        </p>
      )}
    </div>
  )
}
