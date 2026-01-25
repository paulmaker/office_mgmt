'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTimesheet, updateTimesheet } from '@/app/actions/timesheets'
import { getSubcontractors } from '@/app/actions/subcontractors'
import { formatCurrency } from '@/lib/utils'
import type { Timesheet, Subcontractor, TimesheetStatus } from '@prisma/client'

interface TimesheetFormData {
  subcontractorId: string
  periodStart: string
  periodEnd: string
  hoursWorked: number
  rate: number
  additionalHours: number
  additionalHoursRate: number
  expenses: number
  receiptsReceived: boolean
  submittedDate?: string
  submittedVia: string
  notes?: string
}

interface TimesheetFormProps {
  timesheet?: Timesheet | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function TimesheetForm({ timesheet, onSuccess, onCancel }: TimesheetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TimesheetFormData>({
    defaultValues: timesheet
      ? {
          subcontractorId: timesheet.subcontractorId,
          periodStart: timesheet.periodStart.toISOString().split('T')[0],
          periodEnd: timesheet.periodEnd.toISOString().split('T')[0],
          hoursWorked: timesheet.hoursWorked,
          rate: timesheet.rate,
          additionalHours: (timesheet as any).additionalHours || 0,
          additionalHoursRate: (timesheet as any).additionalHoursRate || 0,
          expenses: timesheet.expenses || 0,
          receiptsReceived: timesheet.receiptsReceived || false,
          submittedDate: timesheet.submittedDate?.toISOString().split('T')[0],
          submittedVia: timesheet.submittedVia || 'MANUAL',
          notes: timesheet.notes || '',
        }
      : {
          additionalHours: 0,
          additionalHoursRate: 0,
          expenses: 0,
          receiptsReceived: false,
          submittedVia: 'MANUAL',
        },
  })

  const hoursWorked = watch('hoursWorked') || 0
  const rate = watch('rate') || 0
  const additionalHours = watch('additionalHours') || 0
  const additionalHoursRate = watch('additionalHoursRate') || 0
  const expenses = watch('expenses') || 0
  const regularAmount = hoursWorked * rate
  const additionalAmount = additionalHours * additionalHoursRate
  const grossAmount = regularAmount + additionalAmount
  // Note: CIS calculation would need subcontractor CIS status, shown as estimate
  const estimatedCIS = grossAmount * 0.20 // 20% estimate
  const netAmount = grossAmount - estimatedCIS + expenses

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const data = await getSubcontractors()
        setSubcontractors(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const onSubmit = async (data: TimesheetFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const timesheetData = {
        ...data,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        submittedDate: data.submittedDate ? new Date(data.submittedDate) : undefined,
        expenses: Number(data.expenses),
        additionalHours: Number(data.additionalHours) || 0,
        additionalHoursRate: Number(data.additionalHoursRate) || 0,
      }

      const result = timesheet
        ? await updateTimesheet(timesheet.id, timesheetData)
        : await createTimesheet(timesheetData)
      if (result && 'success' in result && !result.success) {
        setError(result.error ?? 'An error occurred')
        return
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subcontractorId">
          Subcontractor <span className="text-red-500">*</span>
        </Label>
        <select
          id="subcontractorId"
          {...register('subcontractorId', { required: 'Subcontractor is required' })}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <option value="">Select a subcontractor</option>
          {subcontractors.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name} ({sub.cisStatus.replace('_', ' ')})
            </option>
          ))}
        </select>
        {errors.subcontractorId && (
          <p className="text-sm text-red-500">{errors.subcontractorId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="periodStart">
            Period Start <span className="text-red-500">*</span>
          </Label>
          <Input
            id="periodStart"
            type="date"
            {...register('periodStart', { required: 'Period start is required' })}
          />
          {errors.periodStart && (
            <p className="text-sm text-red-500">{errors.periodStart.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="periodEnd">
            Period End <span className="text-red-500">*</span>
          </Label>
          <Input
            id="periodEnd"
            type="date"
            {...register('periodEnd', { required: 'Period end is required' })}
          />
          {errors.periodEnd && (
            <p className="text-sm text-red-500">{errors.periodEnd.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hoursWorked">
            Hours Worked <span className="text-red-500">*</span>
          </Label>
          <Input
            id="hoursWorked"
            type="number"
            step="0.5"
            {...register('hoursWorked', {
              required: 'Hours worked is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
          />
          {errors.hoursWorked && (
            <p className="text-sm text-red-500">{errors.hoursWorked.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate">
            Rate per Hour (£) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            {...register('rate', {
              required: 'Rate is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
          />
          {errors.rate && (
            <p className="text-sm text-red-500">{errors.rate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="additionalHours">Additional Hours</Label>
          <Input
            id="additionalHours"
            type="number"
            step="0.5"
            {...register('additionalHours', {
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
            placeholder="0"
          />
          {errors.additionalHours && (
            <p className="text-sm text-red-500">{errors.additionalHours.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalHoursRate">Additional Hours Rate (£/hr)</Label>
          <Input
            id="additionalHoursRate"
            type="number"
            step="0.01"
            {...register('additionalHoursRate', {
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
            placeholder="0.00"
          />
          {errors.additionalHoursRate && (
            <p className="text-sm text-red-500">{errors.additionalHoursRate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expenses">Expenses (£)</Label>
          <Input
            id="expenses"
            type="number"
            step="0.01"
            {...register('expenses', {
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
          />
          {errors.expenses && (
            <p className="text-sm text-red-500">{errors.expenses.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="submittedDate">Submitted Date</Label>
          <Input
            id="submittedDate"
            type="date"
            {...register('submittedDate')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="submittedVia">Submitted Via</Label>
          <select
            id="submittedVia"
            {...register('submittedVia')}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="MANUAL">Manual Entry</option>
            <option value="EMAIL">Email</option>
            <option value="PORTAL">Portal</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 pt-8">
          <input
            type="checkbox"
            id="receiptsReceived"
            {...register('receiptsReceived')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="receiptsReceived">Receipts Received</Label>
        </div>
      </div>

      {/* Calculation Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Regular Hours ({hoursWorked} × {formatCurrency(rate)}):</span>
          <span>{formatCurrency(regularAmount)}</span>
        </div>
        {additionalHours > 0 && additionalHoursRate > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Additional Hours ({additionalHours} × {formatCurrency(additionalHoursRate)}):</span>
            <span>+{formatCurrency(additionalAmount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t">
          <span className="text-sm font-medium">Gross Amount:</span>
          <span className="text-sm font-medium">{formatCurrency(grossAmount)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>CIS Deduction (estimated):</span>
          <span>-{formatCurrency(estimatedCIS)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Expenses:</span>
          <span>+{formatCurrency(expenses)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t">
          <span className="font-bold">Net Amount:</span>
          <span className="font-bold text-lg">{formatCurrency(netAmount)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          {...register('notes')}
          className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
          placeholder="e.g., Mon 15 clare Street mow cap/ stainblock living room ceiling..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : timesheet
              ? 'Update Timesheet'
              : 'Create Timesheet'}
        </Button>
      </div>
    </form>
  )
}
