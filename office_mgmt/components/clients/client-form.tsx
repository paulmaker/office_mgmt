'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient, updateClient } from '@/app/actions/clients'
import type { Client } from '@prisma/client'

interface ClientFormData {
  name: string
  companyName?: string
  email: string
  phone?: string
  address?: string
  billingAddress?: string
  vatNumber?: string
  vatRegistered: boolean
  cisRegistered: boolean
  paymentTerms: number
  referenceCode?: string
  notes?: string
}

interface ClientFormProps {
  client?: Client | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    defaultValues: client
      ? {
          name: client.name,
          companyName: client.companyName || '',
          email: client.email,
          phone: client.phone || '',
          address: client.address || '',
          billingAddress: client.billingAddress || '',
          vatNumber: client.vatNumber || '',
          vatRegistered: client.vatRegistered,
          cisRegistered: client.cisRegistered,
          paymentTerms: client.paymentTerms,
          referenceCode: client.referenceCode || '',
          notes: client.notes || '',
        }
      : {
          vatRegistered: false,
          cisRegistered: false,
          paymentTerms: 30,
        },
  })

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (client) {
        await updateClient(client.id, data)
      } else {
        await createClient(data)
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

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingAddress">Billing Address</Label>
            <Input id="billingAddress" {...register('billingAddress')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referenceCode">Reference Code</Label>
              <Input
                id="referenceCode"
                {...register('referenceCode', {
                  pattern: {
                    value: /^[A-Z]{1,3}\d{6}$/,
                    message: 'Reference code must be 1-3 uppercase letters followed by 6 digits (e.g., BS000001)',
                  },
                })}
                placeholder="Auto-generated if left empty"
                className="uppercase"
              />
              {errors.referenceCode && (
                <p className="text-sm text-red-500">{errors.referenceCode.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Format: Base code (1-3 letters) + 6-digit number (e.g., BS000001). Auto-generated if left empty.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input id="vatNumber" {...register('vatNumber')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cisRegistered"
                {...register('cisRegistered')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="cisRegistered">CIS Registered</Label>
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
                : client
                  ? 'Update Client'
                  : 'Create Client'}
            </Button>
          </div>
        </form>
  )
}
