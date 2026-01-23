'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAsset, updateAsset } from '@/app/actions/assets'
import type { CompanyAsset, AssetType } from '@prisma/client'

interface AssetFormData {
  type: AssetType
  name: string
  registrationNumber?: string
  motDueDate?: string
  taxDueDate?: string
  insuranceDueDate?: string
  serviceDueDate?: string
  leaseExpiryDate?: string
  merseyFlow: boolean
  companyCar: boolean
  remindersEnabled: boolean
  notes?: string
}

interface AssetFormProps {
  asset?: CompanyAsset | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function AssetForm({ asset, onSuccess, onCancel }: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssetFormData>({
    defaultValues: asset
      ? {
          type: asset.type,
          name: asset.name,
          registrationNumber: asset.registrationNumber || '',
          motDueDate: asset.motDueDate?.toISOString().split('T')[0] || '',
          taxDueDate: asset.taxDueDate?.toISOString().split('T')[0] || '',
          insuranceDueDate: asset.insuranceDueDate?.toISOString().split('T')[0] || '',
          serviceDueDate: asset.serviceDueDate?.toISOString().split('T')[0] || '',
          leaseExpiryDate: asset.leaseExpiryDate?.toISOString().split('T')[0] || '',
          merseyFlow: asset.merseyFlow ?? true,
          companyCar: asset.companyCar ?? true,
          remindersEnabled: asset.remindersEnabled ?? true,
          notes: asset.notes || '',
        }
      : {
          type: 'VEHICLE',
          merseyFlow: true,
          companyCar: true,
          remindersEnabled: true,
        },
  })

  const onSubmit = async (data: AssetFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const assetData = {
        ...data,
        motDueDate: data.motDueDate ? new Date(data.motDueDate) : undefined,
        taxDueDate: data.taxDueDate ? new Date(data.taxDueDate) : undefined,
        insuranceDueDate: data.insuranceDueDate ? new Date(data.insuranceDueDate) : undefined,
        serviceDueDate: data.serviceDueDate ? new Date(data.serviceDueDate) : undefined,
        leaseExpiryDate: data.leaseExpiryDate ? new Date(data.leaseExpiryDate) : undefined,
        registrationNumber: data.registrationNumber || undefined,
        notes: data.notes || undefined,
      }

      if (asset) {
        await updateAsset(asset.id, assetData)
      } else {
        await createAsset(assetData)
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">
            Asset Type <span className="text-red-500">*</span>
          </Label>
          <select
            id="type"
            {...register('type', { required: 'Asset type is required' })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="VEHICLE">Vehicle</option>
            <option value="EQUIPMENT">Equipment</option>
          </select>
          {errors.type && (
            <p className="text-sm text-red-500">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register('name', { required: 'Name is required' })}
            placeholder="e.g., Ford Transit"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registrationNumber">Registration Number</Label>
        <Input
          id="registrationNumber"
          {...register('registrationNumber')}
          placeholder="e.g., AB12 CDE"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="motDueDate">MOT Due Date</Label>
          <Input
            id="motDueDate"
            type="date"
            {...register('motDueDate')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxDueDate">Tax Due Date</Label>
          <Input
            id="taxDueDate"
            type="date"
            {...register('taxDueDate')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="insuranceDueDate">Insurance Due Date</Label>
          <Input
            id="insuranceDueDate"
            type="date"
            {...register('insuranceDueDate')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serviceDueDate">Service Due Date</Label>
          <Input
            id="serviceDueDate"
            type="date"
            {...register('serviceDueDate')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="leaseExpiryDate">Lease Expiry Date</Label>
        <Input
          id="leaseExpiryDate"
          type="date"
          {...register('leaseExpiryDate')}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="merseyFlow"
            {...register('merseyFlow')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="merseyFlow">MerseyFlow</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="companyCar"
            {...register('companyCar')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="companyCar">Company Car</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="remindersEnabled"
            {...register('remindersEnabled')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="remindersEnabled">Reminders Enabled</Label>
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
            : asset
              ? 'Update Asset'
              : 'Create Asset'}
        </Button>
      </div>
    </form>
  )
}
