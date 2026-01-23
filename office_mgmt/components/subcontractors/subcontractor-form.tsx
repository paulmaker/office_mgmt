'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSubcontractor, updateSubcontractor } from '@/app/actions/subcontractors'
import type { Subcontractor, CISStatus, PaymentType } from '@prisma/client'

interface SubcontractorFormData {
  name: string
  email: string
  phone?: string
  address?: string
  niNumber?: string
  utr?: string
  cisVerificationNumber?: string
  cisStatus: CISStatus
  paymentType: PaymentType
  notes?: string
}

interface SubcontractorFormProps {
  subcontractor?: Subcontractor | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function SubcontractorForm({ subcontractor, onSuccess, onCancel }: SubcontractorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubcontractorFormData>({
    defaultValues: subcontractor
      ? {
          name: subcontractor.name,
          email: subcontractor.email,
          phone: subcontractor.phone || '',
          address: subcontractor.address || '',
          niNumber: subcontractor.niNumber || '',
          utr: subcontractor.utr || '',
          cisVerificationNumber: subcontractor.cisVerificationNumber || '',
          cisStatus: subcontractor.cisStatus,
          paymentType: subcontractor.paymentType,
          notes: subcontractor.notes || '',
        }
      : {
          cisStatus: 'NOT_VERIFIED',
          paymentType: 'CIS',
        },
  })

  const onSubmit = async (data: SubcontractorFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (subcontractor) {
        await updateSubcontractor(subcontractor.id, data)
      } else {
        await createSubcontractor(data)
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
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register('email', {
              required: 'Email is required',
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" {...register('phone')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="niNumber">NI Number</Label>
          <Input id="niNumber" {...register('niNumber')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register('address')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="utr">UTR (Unique Taxpayer Reference)</Label>
          <Input id="utr" {...register('utr')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cisVerificationNumber">CIS Verification Number</Label>
          <Input id="cisVerificationNumber" {...register('cisVerificationNumber')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cisStatus">CIS Status</Label>
          <select
            id="cisStatus"
            {...register('cisStatus', { required: true })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="NOT_VERIFIED">Not Verified</option>
            <option value="VERIFIED_GROSS">Verified Gross</option>
            <option value="VERIFIED_NET">Verified Net</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentType">Payment Type</Label>
          <select
            id="paymentType"
            {...register('paymentType', { required: true })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="CIS">CIS</option>
            <option value="NON_CIS">Non-CIS</option>
          </select>
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
            : subcontractor
              ? 'Update Subcontractor'
              : 'Create Subcontractor'}
        </Button>
      </div>
    </form>
  )
}
