'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createJobPrice, updateJobPrice } from '@/app/actions/job-prices'
import { getClients } from '@/app/actions/clients'
import { formatCurrency } from '@/lib/utils'
import type { JobPrice, Client } from '@prisma/client'

interface JobPriceFormData {
  clientId: string
  jobType: string
  description: string
  price: number
  isActive: boolean
  notes?: string
}

interface JobPriceFormProps {
  jobPrice?: JobPrice | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function JobPriceForm({ jobPrice, onSuccess, onCancel }: JobPriceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobPriceFormData>({
    defaultValues: jobPrice
      ? {
          clientId: jobPrice.clientId,
          jobType: jobPrice.jobType,
          description: jobPrice.description,
          price: jobPrice.price,
          isActive: jobPrice.isActive,
          notes: jobPrice.notes || '',
        }
      : {
          isActive: true,
        },
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const data = await getClients()
        setClients(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const onSubmit = async (data: JobPriceFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const jobPriceData = {
        ...data,
        price: Number(data.price),
      }

      if (jobPrice) {
        await updateJobPrice(jobPrice.id, jobPriceData)
      } else {
        await createJobPrice(jobPriceData)
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
        <Label htmlFor="clientId">
          Client <span className="text-red-500">*</span>
        </Label>
        <select
          id="clientId"
          {...register('clientId', { required: 'Client is required' })}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          disabled={!!jobPrice}
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
        <Label htmlFor="jobType">
          Job Type <span className="text-red-500">*</span>
        </Label>
        <Input
          id="jobType"
          {...register('jobType', { required: 'Job type is required' })}
          placeholder="e.g., Bathroom, Living Room, Stairs"
        />
        {errors.jobType && (
          <p className="text-sm text-red-500">{errors.jobType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-red-500">*</span>
        </Label>
        <Input
          id="description"
          {...register('description', { required: 'Description is required' })}
          placeholder="Detailed description of the job"
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">
          Price (£) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          {...register('price', {
            required: 'Price is required',
            valueAsNumber: true,
            min: { value: 0, message: 'Must be 0 or greater' },
          })}
          placeholder="0.00"
        />
        {errors.price && (
          <p className="text-sm text-red-500">{errors.price.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          {...register('isActive')}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="isActive">Active</Label>
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
            : jobPrice
              ? 'Update Job Price'
              : 'Create Job Price'}
        </Button>
      </div>
    </form>
  )
}
