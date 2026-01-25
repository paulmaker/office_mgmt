'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupplier, updateSupplier } from '@/app/actions/suppliers'
import type { Supplier } from '@prisma/client'

interface SupplierFormData {
  name: string
  companyName?: string
  email?: string
  phone?: string
  address?: string
  vatNumber?: string
  vatRegistered: boolean
  paymentTerms: number
  notes?: string
}

interface SupplierFormProps {
  supplier?: Supplier | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function SupplierForm({ supplier, onSuccess, onCancel }: SupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    defaultValues: supplier
      ? {
          name: supplier.name,
          companyName: supplier.companyName || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          vatNumber: supplier.vatNumber || '',
          vatRegistered: supplier.vatRegistered,
          paymentTerms: supplier.paymentTerms,
          notes: supplier.notes || '',
        }
      : {
          vatRegistered: false,
          paymentTerms: 30,
        },
  })

  const onSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = supplier
        ? await updateSupplier(supplier.id, data)
        : await createSupplier(data)
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input id="companyName" {...register('companyName')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email', {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" {...register('phone')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register('address')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vatNumber">VAT Number</Label>
          <Input id="vatNumber" {...register('vatNumber')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
          <Input
            id="paymentTerms"
            type="number"
            {...register('paymentTerms', {
              valueAsNumber: true,
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
          />
          {errors.paymentTerms && (
            <p className="text-sm text-red-500">
              {errors.paymentTerms.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="vatRegistered"
            {...register('vatRegistered')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="vatRegistered">VAT Registered</Label>
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
            : supplier
              ? 'Update Supplier'
              : 'Create Supplier'}
        </Button>
      </div>
    </form>
  )
}
