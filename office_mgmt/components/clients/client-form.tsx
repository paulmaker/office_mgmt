'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient, updateClient } from '@/app/actions/clients'
import type { ClientInvoiceEmail } from '@/app/actions/clients'
import type { Client } from '@prisma/client'
import { Plus, Trash2 } from 'lucide-react'

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

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

function parseInvoiceEmails(raw: unknown): ClientInvoiceEmail[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is { email?: string; sendInvoices?: boolean } => item != null && typeof item === 'object')
    .map((item) => ({
      email: typeof item.email === 'string' ? item.email.trim() : '',
      sendInvoices: Boolean(item.sendInvoices),
    }))
    .filter((item) => item.email.length > 0)
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sameAsBuildingAddress, setSameAsBuildingAddress] = useState(false)
  const [invoiceEmails, setInvoiceEmails] = useState<ClientInvoiceEmail[]>(() =>
    client ? parseInvoiceEmails((client as Client & { invoiceEmails?: unknown }).invoiceEmails) : []
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const watchedAddress = watch('address')

  // Sync billing address when "Same as Building Address" is checked
  useEffect(() => {
    if (sameAsBuildingAddress && watchedAddress) {
      setValue('billingAddress', watchedAddress)
    }
  }, [sameAsBuildingAddress, watchedAddress, setValue])

  const handleSameAddressChange = (checked: boolean) => {
    setSameAsBuildingAddress(checked)
    if (checked && watchedAddress) {
      setValue('billingAddress', watchedAddress)
    }
  }

  const addInvoiceEmail = () => {
    setInvoiceEmails((prev) => [...prev, { email: '', sendInvoices: true }])
  }

  const removeInvoiceEmail = (index: number) => {
    setInvoiceEmails((prev) => prev.filter((_, i) => i !== index))
  }

  const updateInvoiceEmail = (index: number, field: 'email' | 'sendInvoices', value: string | boolean) => {
    setInvoiceEmails((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true)
    setError(null)

    const cleanedInvoiceEmails = invoiceEmails
      .map((item) => ({ ...item, email: item.email.trim() }))
      .filter((item) => item.email.length > 0)

    const primary = data.email.trim().toLowerCase()
    const duplicates = cleanedInvoiceEmails.filter(
      (item, i, arr) =>
        arr.findIndex((o) => o.email.toLowerCase() === item.email.toLowerCase()) !== i ||
        item.email.toLowerCase() === primary
    )
    if (duplicates.length > 0) {
      setError('Duplicate or primary email in invoice emails list. Use unique addresses.')
      setIsSubmitting(false)
      return
    }
    for (const item of cleanedInvoiceEmails) {
      if (!EMAIL_REGEX.test(item.email)) {
        setError(`Invalid email in invoice list: ${item.email}`)
        setIsSubmitting(false)
        return
      }
    }

    try {
      const payload = { ...data, invoiceEmails: cleanedInvoiceEmails.length > 0 ? cleanedInvoiceEmails : null }
      let result
      if (client) {
        result = await updateClient(client.id, payload)
      } else {
        result = await createClient(payload)
      }
      
      if (result && 'success' in result && !result.success) {
        setError(result.error ?? 'An error occurred')
        return
      }
      onSuccess?.()
    } catch (err) {
      // In production, Next.js may sanitize error messages, so we need to extract the message carefully
      let errorMessage = 'An error occurred'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message)
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      setError(errorMessage)
      console.error('Client form error:', err)
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
            <div className="flex items-center justify-between">
              <Label>Additional invoice emails</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInvoiceEmail}>
                <Plus className="h-4 w-4 mr-1" />
                Add email
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Add extra addresses to receive invoice emails. Tick &quot;Send invoices&quot; to include them when you send an invoice.
            </p>
            {invoiceEmails.length > 0 && (
              <ul className="space-y-2">
                {invoiceEmails.map((item, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={item.email}
                      onChange={(e) => updateInvoiceEmail(index, 'email', e.target.value)}
                      className="flex-1 min-w-[180px]"
                    />
                    <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.sendInvoices}
                        onChange={(e) => updateInvoiceEmail(index, 'sendInvoices', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Send invoices
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInvoiceEmail(index)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="billingAddress">Billing Address</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sameAsBuildingAddress"
                  checked={sameAsBuildingAddress}
                  onChange={(e) => handleSameAddressChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="sameAsBuildingAddress" className="text-sm font-normal text-gray-600">
                  Same as Building Address
                </Label>
              </div>
            </div>
            <Input
              id="billingAddress"
              {...register('billingAddress')}
              disabled={sameAsBuildingAddress}
              className={sameAsBuildingAddress ? 'bg-gray-100' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referenceCode">Reference Code</Label>
              <Input
                id="referenceCode"
                {...register('referenceCode', {
                  pattern: {
                    value: /^[A-Z]{3}$/,
                    message: 'Reference code must be exactly 3 uppercase letters (e.g., JOH, SMI, ABC)',
                  },
                  required: {
                    value: false,
                    message: 'Reference code is optional but if provided must be 3 letters',
                  },
                })}
                placeholder="JOH, SMI, ABC"
                className="uppercase"
                maxLength={3}
                onInput={(e) => {
                  // Only allow uppercase letters, max 3
                  const input = e.currentTarget
                  input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3)
                }}
              />
              {errors.referenceCode && (
                <p className="text-sm text-red-500">{errors.referenceCode.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Enter 3 letters (e.g., JOH, SMI, ABC). If left empty, will auto-generate.
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
