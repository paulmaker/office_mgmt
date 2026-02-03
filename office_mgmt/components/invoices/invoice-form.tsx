'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInvoice, updateInvoice, getInvoice } from '@/app/actions/invoices'
import { getClients } from '@/app/actions/clients'
import { getSubcontractors } from '@/app/actions/subcontractors'
import { getSuppliers } from '@/app/actions/suppliers'
import { getJobsByClient, getJobs } from '@/app/actions/jobs'
import { getJobPrices } from '@/app/actions/job-prices'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { PDFUpload } from '@/components/banking/pdf-upload'
import type { Invoice, Client, Subcontractor, Supplier, Job, InvoiceType, InvoiceStatus } from '@prisma/client'

interface InvoiceLineItem {
  jobId?: string
  jobNumber?: string
  description: string
  quantity?: number
  rate?: number
  amount: number
}

interface InvoiceFormData {
  type: InvoiceType
  clientId?: string
  subcontractorId?: string
  supplierId?: string
  jobId?: string
  date: string
  dueDate: string
  sentDate?: string
  receivedDate?: string
  description?: string
  purchaseOrderNumber?: string
  discountAmount?: number
  discountPercentage?: number
  discountType?: string
  lineItems: InvoiceLineItem[]
  vatRate: number
  reverseCharge: boolean
  cisDeduction: number
  cisRate: number
  status: InvoiceStatus
  documentUrl?: string
  notes?: string
}

interface InvoiceFormProps {
  invoice?: Invoice | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [availableJobs, setAvailableJobs] = useState<any[]>([])
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [jobPrices, setJobPrices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    defaultValues: invoice
      ? {
          type: invoice.type,
          clientId: invoice.clientId || undefined,
          subcontractorId: invoice.subcontractorId || undefined,
          supplierId: invoice.supplierId || undefined,
          jobId: (invoice as any).jobId || undefined,
          date: invoice.date.toISOString().split('T')[0],
          dueDate: invoice.dueDate.toISOString().split('T')[0],
          sentDate: (invoice as any).sentDate ? new Date((invoice as any).sentDate).toISOString().split('T')[0] : undefined,
          receivedDate: (invoice as any).receivedDate ? new Date((invoice as any).receivedDate).toISOString().split('T')[0] : undefined,
          description: (invoice as any).description || '',
          purchaseOrderNumber: (invoice as any).purchaseOrderNumber || '',
          discountAmount: (invoice as any).discountAmount || 0,
          discountPercentage: (invoice as any).discountPercentage || 0,
          discountType: (invoice as any).discountType || undefined,
          lineItems: (invoice.lineItems as any) || [],
          vatRate: invoice.vatRate,
          reverseCharge: invoice.reverseCharge,
          cisDeduction: invoice.cisDeduction,
          cisRate: invoice.cisRate,
          status: invoice.status,
          documentUrl: (invoice as any).documentUrl || undefined,
          notes: invoice.notes || '',
        }
      : {
          type: 'SALES',
          vatRate: 20,
          reverseCharge: false,
          cisDeduction: 0,
          cisRate: 0,
          status: 'DRAFT',
          discountAmount: 0,
          discountPercentage: 0,
          documentUrl: undefined,
          lineItems: [{ description: '', amount: 0 }],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  })

  const invoiceType = watch('type')
  const selectedClientId = watch('clientId')
  const watchedLineItems = watch('lineItems')
  const reverseCharge = watch('reverseCharge')
  const vatRate = watch('vatRate')
  const discountType = watch('discountType')
  const discountAmount = watch('discountAmount') || 0
  const discountPercentage = watch('discountPercentage') || 0

  // Calculate subtotal from line items
  let subtotal = watchedLineItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
  
  // Apply discount
  let discount = 0
  if (discountType === 'PERCENTAGE' && discountPercentage > 0) {
    discount = subtotal * (discountPercentage / 100)
  } else if (discountType === 'FIXED' && discountAmount > 0) {
    discount = discountAmount
  }
  subtotal = subtotal - discount
  
  const vatAmount = reverseCharge ? 0 : subtotal * ((vatRate || 0) / 100)
  const cisDeduction = watch('cisDeduction') || 0
  const total = subtotal + vatAmount - cisDeduction

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [clientsData, subcontractorsData, suppliersData, jobsData] = await Promise.all([
          getClients(),
          getSubcontractors(),
          getSuppliers(),
          getJobs(),
        ])
        setClients(clientsData)
        setSubcontractors(subcontractorsData)
        setSuppliers(suppliersData)
        setAllJobs(jobsData as Job[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const loadJobs = async () => {
      if (selectedClientId && invoiceType === 'SALES') {
        try {
          const jobs = await getJobsByClient(selectedClientId)
          setAvailableJobs(jobs)
        } catch (err) {
          console.error('Failed to load jobs:', err)
          setAvailableJobs([])
        }
      } else {
        setAvailableJobs([])
      }
    }
    loadJobs()
  }, [selectedClientId, invoiceType])

  useEffect(() => {
    const loadJobPrices = async () => {
      if (selectedClientId && invoiceType === 'SALES') {
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
  }, [selectedClientId, invoiceType])

  const addJobPriceToLineItems = (jobPrice: any) => {
    // Check if the first row is empty and fill it instead of appending
    if (
      fields.length === 1 &&
      !watchedLineItems[0]?.description?.trim() &&
      (!watchedLineItems[0]?.amount || watchedLineItems[0]?.amount === 0)
    ) {
      // Replace the empty first row
      setValue('lineItems.0.description', jobPrice.jobType)
      setValue('lineItems.0.amount', jobPrice.price)
    } else {
      append({
        description: jobPrice.jobType,
        amount: jobPrice.price,
      })
    }
  }

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate at least one line item
      if (!data.lineItems || data.lineItems.length === 0) {
        throw new Error('At least one line item is required')
      }

      // Validate line items
      for (const item of data.lineItems) {
        if (!item.description.trim()) {
          throw new Error('All line items must have a description')
        }
        if (item.amount <= 0) {
          throw new Error('All line items must have an amount greater than 0')
        }
      }

      // Validate client/subcontractor/supplier based on type
      if (data.type === 'SALES' && !data.clientId) {
        throw new Error('Sales invoices require a client')
      }
      if (data.type === 'PURCHASE' && !data.subcontractorId && !data.supplierId) {
        throw new Error('Purchase invoices require a subcontractor or supplier')
      }

      const invoiceData = {
        ...data,
        date: new Date(data.date),
        dueDate: new Date(data.dueDate),
        sentDate: data.sentDate ? new Date(data.sentDate) : undefined,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
        discountAmount: discount,
        documentUrl: data.documentUrl,
        lineItems: data.lineItems.map(item => ({
          jobId: item.jobId,
          jobNumber: item.jobNumber,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: Number(item.amount),
        })),
      }

      const result = invoice
        ? await updateInvoice(invoice.id, invoiceData)
        : await createInvoice(invoiceData)
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
    append({ description: '', amount: 0 })
  }

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const addJobToLineItems = (job: any) => {
    // Add all line items from the job
    job.lineItems.forEach((lineItem: any) => {
      append({
        jobId: job.id,
        jobNumber: job.jobNumber,
        description: `${job.jobNumber} - ${lineItem.description}`,
        amount: lineItem.amount,
      })
    })
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
          <Label htmlFor="type">
            Invoice Type <span className="text-red-500">*</span>
          </Label>
          <select
            id="type"
            {...register('type', { required: true })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="SALES">Sales Invoice</option>
            <option value="PURCHASE">Purchase Invoice</option>
          </select>
        </div>

        {invoiceType === 'SALES' ? (
          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client <span className="text-red-500">*</span>
            </Label>
            <select
              id="clientId"
              {...register('clientId', { required: invoiceType === 'SALES' })}
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
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="subcontractorId">Subcontractor</Label>
              <select
                id="subcontractorId"
                {...register('subcontractorId')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <option value="">Select a subcontractor</option>
                {subcontractors.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierId">Supplier</Label>
              <select
                id="supplierId"
                {...register('supplierId')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">
            Invoice Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            {...register('date', { required: 'Date is required' })}
          />
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">
            Due Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dueDate"
            type="date"
            {...register('dueDate', { required: 'Due date is required' })}
          />
          {errors.dueDate && (
            <p className="text-sm text-red-500">{errors.dueDate.message}</p>
          )}
        </div>
      </div>

      {/* Date Tracking */}
      <div className="grid grid-cols-2 gap-4">
        {invoiceType === 'SALES' ? (
          <div className="space-y-2">
            <Label htmlFor="sentDate">Date Sent</Label>
            <Input
              id="sentDate"
              type="date"
              {...register('sentDate')}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="receivedDate">Date Received</Label>
            <Input
              id="receivedDate"
              type="date"
              {...register('receivedDate')}
            />
          </div>
        )}
      </div>

      {/* PDF Document Upload for Purchase Invoices */}
      {invoiceType === 'PURCHASE' && (
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Label>Attach Invoice PDF</Label>
          <PDFUpload
            value={watch('documentUrl')}
            onChange={(url) => setValue('documentUrl', url)}
            onRemove={() => setValue('documentUrl', undefined)}
            description="Attach a copy of the original invoice PDF for your records (max 50MB)."
          />
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register('description')}
          className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          rows={2}
          placeholder="General description for this invoice"
        />
      </div>

      {/* References */}
      <div className="space-y-2">
        <Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label>
        <Input
          id="purchaseOrderNumber"
          {...register('purchaseOrderNumber')}
          placeholder="PO-12345"
        />
      </div>

      {/* Job Selection */}
      {invoiceType === 'SALES' && allJobs.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="jobId">Link to Job (Optional)</Label>
          <select
            id="jobId"
            {...register('jobId')}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="">No job linked</option>
            {allJobs
              .filter(job => !selectedClientId || job.clientId === selectedClientId)
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobNumber} - {job.jobDescription}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Job Prices Selection for Sales Invoices */}
      {invoiceType === 'SALES' && selectedClientId && jobPrices.length > 0 && (
        <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
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

      {/* Job Selection for Sales Invoices */}
      {invoiceType === 'SALES' && selectedClientId && availableJobs.length > 0 && (
        <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Label>Select Jobs to Add (from this month)</Label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {availableJobs.map((job) => (
              <Button
                key={job.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addJobToLineItems(job)}
                className="justify-start text-left"
              >
                <Plus className="h-3 w-3 mr-1" />
                {job.jobNumber} - {formatCurrency(job.price)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Click to add job line items to invoice
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
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Job #</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-3 py-2">
                    <Input
                      {...register(`lineItems.${index}.jobNumber` as const)}
                      placeholder="Job #"
                      className="border-0 p-0 h-auto text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      {...register(`lineItems.${index}.description` as const, {
                        required: 'Description is required',
                      })}
                      placeholder="Description"
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
                <td colSpan={2} className="px-3 py-2 text-right font-medium">
                  Subtotal (before discount):
                </td>
                <td className="px-3 py-2 font-medium">
                  {formatCurrency(watchedLineItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Label className="text-xs font-normal">Discount:</Label>
                    <select
                      {...register('discountType')}
                      className="h-7 text-xs border border-gray-300 rounded px-2"
                    >
                      <option value="">No discount</option>
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                    {discountType === 'PERCENTAGE' && (
                      <Input
                        type="number"
                        step="0.1"
                        {...register('discountPercentage', { valueAsNumber: true, min: 0, max: 100 })}
                        className="w-20 h-7 text-xs"
                        placeholder="%"
                      />
                    )}
                    {discountType === 'FIXED' && (
                      <Input
                        type="number"
                        step="0.01"
                        {...register('discountAmount', { valueAsNumber: true, min: 0 })}
                        className="w-24 h-7 text-xs"
                        placeholder="Amount"
                      />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {discount > 0 ? (
                    <span className="text-red-600">-{formatCurrency(discount)}</span>
                  ) : (
                    <span className="text-gray-400">£0.00</span>
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right font-medium">
                  Subtotal (after discount):
                </td>
                <td className="px-3 py-2 font-medium">
                  {formatCurrency(subtotal)}
                </td>
              </tr>
              {invoiceType === 'SALES' && (
                <>
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <input
                          type="checkbox"
                          id="reverseCharge"
                          {...register('reverseCharge')}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="reverseCharge" className="text-sm font-normal">
                          Reverse Charge VAT
                        </Label>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {reverseCharge ? (
                        <span className="text-sm text-gray-500">VAT: £0.00 (Reverse Charge)</span>
                      ) : (
                        <span className="text-sm">
                          VAT ({vatRate}%): {formatCurrency(vatAmount)}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right">
                      <Label htmlFor="vatRate" className="text-sm font-normal">VAT Rate:</Label>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.1"
                        {...register('vatRate', {
                          valueAsNumber: true,
                          min: 0,
                          max: 100,
                        })}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-sm ml-1">%</span>
                    </td>
                  </tr>
                </>
              )}
              {invoiceType === 'PURCHASE' && (
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-right">
                    <Label htmlFor="cisDeduction" className="text-sm font-normal">CIS Deduction:</Label>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      {...register('cisDeduction', {
                        valueAsNumber: true,
                        min: 0,
                      })}
                      className="w-24 h-8 text-sm"
                    />
                  </td>
                </tr>
              )}
              <tr className="bg-gray-100">
                <td colSpan={2} className="px-3 py-2 text-right font-bold">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            {...register('status', { required: true })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
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
            : invoice
              ? 'Update Invoice'
              : 'Create Invoice'}
        </Button>
      </div>
    </form>
  )
}
