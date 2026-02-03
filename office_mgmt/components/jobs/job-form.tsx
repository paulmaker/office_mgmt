'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createJob, updateJob } from '@/app/actions/jobs'
import { getClients } from '@/app/actions/clients'
import { getEmployees } from '@/app/actions/employees'
import { getSubcontractors } from '@/app/actions/subcontractors'
import { getJobPrices } from '@/app/actions/job-prices'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import type { Job, Client, Employee, Subcontractor, JobStatus, JobLineItem as PrismaJobLineItem } from '@prisma/client'

interface JobLineItem {
  id?: string
  description: string
  amount: number
  notes?: string
}

type JobWithRelations = Job & {
  employees?: Array<{
    employee: Employee
    employeeId: string
  }>
  subcontractors?: Array<{
    subcontractor: Subcontractor
    subcontractorId: string
  }>
  lineItems?: PrismaJobLineItem[]
}

interface JobFormData {
  jobNumber?: string
  clientId: string
  jobDescription: string
  dateWorkCommenced: string
  employeeIds: string[]
  subcontractorIds: string[]
  lineItems: JobLineItem[]
  status: JobStatus
  notes?: string
}

interface JobFormProps {
  job?: JobWithRelations | null
  onSuccess?: () => void
  onCancel?: () => void
}

type JobPrice = {
  id: string
  clientId: string
  jobType: string
  description: string
  price: number
  isActive: boolean
  notes?: string | null
}

export function JobForm({ job, onSuccess, onCancel }: JobFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [jobPrices, setJobPrices] = useState<JobPrice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobFormData>({
    defaultValues: job
      ? {
          jobNumber: job.jobNumber,
          clientId: job.clientId,
          jobDescription: job.jobDescription,
          dateWorkCommenced: job.dateWorkCommenced.toISOString().split('T')[0],
          employeeIds: job.employees?.map(je => je.employee.id) || [],
          subcontractorIds: job.subcontractors?.map(js => js.subcontractor.id) || [],
          lineItems: job.lineItems?.map(li => ({
            id: li.id,
            description: li.description,
            amount: li.amount,
            notes: li.notes || '',
          })) || [],
          status: job.status,
          notes: job.notes || '',
        }
      : {
          employeeIds: [],
          subcontractorIds: [],
          lineItems: [{ description: '', amount: 0, notes: '' }],
          status: 'PENDING',
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  })

  const watchedLineItems = watch('lineItems')
  const selectedClientId = watch('clientId')
  const total = watchedLineItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [clientsData, employeesData, subcontractorsData] = await Promise.all([
          getClients(),
          getEmployees(),
          getSubcontractors(),
        ])
        setClients(clientsData)
        setEmployees(employeesData)
        setSubcontractors(subcontractorsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const loadJobPrices = async () => {
      if (selectedClientId) {
        try {
          const prices = await getJobPrices(selectedClientId)
          setJobPrices(prices.filter(jp => jp.isActive))
        } catch (err) {
          console.error('Failed to load job prices:', err)
          setJobPrices([])
        }
      } else {
        setJobPrices([])
      }
    }
    loadJobPrices()
  }, [selectedClientId])

  const addJobPriceToLineItems = (jobPrice: JobPrice) => {
    // Check if the first row is empty and fill it instead of appending
    if (
      fields.length === 1 &&
      !watchedLineItems[0]?.description?.trim() &&
      (!watchedLineItems[0]?.amount || watchedLineItems[0]?.amount === 0)
    ) {
      // Replace the empty first row
      setValue('lineItems.0.description', jobPrice.jobType)
      setValue('lineItems.0.amount', jobPrice.price)
      setValue('lineItems.0.notes', jobPrice.description || '')
    } else {
      append({
        description: jobPrice.jobType,
        amount: jobPrice.price,
        notes: jobPrice.description || '',
      })
    }
  }

  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate at least one line item
      if (!data.lineItems || data.lineItems.length === 0) {
        throw new Error('At least one line item is required')
      }

      // Validate line items have descriptions and amounts
      for (const item of data.lineItems) {
        if (!item.description.trim()) {
          throw new Error('All line items must have a description')
        }
        if (item.amount <= 0) {
          throw new Error('All line items must have an amount greater than 0')
        }
      }

      const jobData = {
        ...data,
        dateWorkCommenced: new Date(data.dateWorkCommenced),
        subcontractorIds: data.subcontractorIds || [],
        lineItems: data.lineItems.map(item => ({
          description: item.description,
          amount: Number(item.amount),
          notes: item.notes,
        })),
      }

      const result = job
        ? await updateJob(job.id, jobData)
        : await createJob(jobData)
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

  const addLineItem = () => {
    append({ description: '', amount: 0, notes: '' })
  }

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">
            Client <span className="text-red-500">*</span>
          </Label>
          <select
            id="clientId"
            {...register('clientId', { required: 'Client is required' })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName || client.name}
              </option>
            ))}
          </select>
          {errors.clientId && (
            <p className="text-sm text-red-500">{errors.clientId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobNumber">
            Job Number
          </Label>
          <Input
            id="jobNumber"
            {...register('jobNumber')}
            placeholder="Leave blank to auto-generate"
          />
          <p className="text-xs text-gray-500">
            Optional - will be auto-generated if not provided
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobDescription">
          Job Description <span className="text-red-500">*</span>
        </Label>
        <Input
          id="jobDescription"
          {...register('jobDescription', { required: 'Job description is required' })}
        />
        {errors.jobDescription && (
          <p className="text-sm text-red-500">{errors.jobDescription.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateWorkCommenced">
            Date Work Commenced <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dateWorkCommenced"
            type="date"
            {...register('dateWorkCommenced', { required: 'Date is required' })}
          />
          {errors.dateWorkCommenced && (
            <p className="text-sm text-red-500">{errors.dateWorkCommenced.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            {...register('status', { required: true })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employeeIds">Employees</Label>
          <select
            id="employeeIds"
            multiple
            {...register('employeeIds')}
            className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} {employee.employeeId ? `(${employee.employeeId})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Hold Ctrl/Cmd to select multiple
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subcontractorIds">Subcontractors</Label>
          <select
            id="subcontractorIds"
            multiple
            {...register('subcontractorIds')}
            className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {subcontractors.map((subcontractor) => (
              <option key={subcontractor.id} value={subcontractor.id}>
                {subcontractor.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Hold Ctrl/Cmd to select multiple
          </p>
        </div>
      </div>

      {selectedClientId && jobPrices.length > 0 && (
        <div className="space-y-2">
          <Label>Quick Add from Job Prices</Label>
          <div className="flex flex-wrap gap-2">
            {jobPrices.map((jp) => (
              <Button
                key={jp.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addJobPriceToLineItems(jp)}
                className="text-xs"
              >
                {jp.jobType} - {formatCurrency(jp.price)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Click a job price to add it as a line item
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Line Item
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-3 py-2">
                    <Input
                      {...register(`lineItems.${index}.description` as const, {
                        required: 'Description is required',
                      })}
                      placeholder="e.g., Bathroom, Living Room"
                      className="border-0 p-0 h-auto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lineItems.${index}.amount` as const, {
                        required: 'Amount is required',
                        valueAsNumber: true,
                        min: { value: 0.01, message: 'Must be greater than 0' },
                      })}
                      placeholder="0.00"
                      className="border-0 p-0 h-auto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      {...register(`lineItems.${index}.notes` as const)}
                      placeholder="Optional notes"
                      className="border-0 p-0 h-auto"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right font-medium">
                  Total:
                </td>
                <td className="px-3 py-2 font-bold text-lg">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          {...register('notes')}
          className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
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
            : job
              ? 'Update Job'
              : 'Create Job'}
        </Button>
      </div>
    </form>
  )
}
