'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createQuickLink, updateQuickLink } from '@/app/actions/quick-links'
import type { QuickLink } from '@prisma/client'

const quickLinkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  category: z.string().min(1, "Category is required"),
  displayOrder: z.number().int(),
})

type QuickLinkFormData = z.infer<typeof quickLinkSchema>

interface QuickLinkFormProps {
  quickLink?: QuickLink | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function QuickLinkForm({ quickLink, onSuccess, onCancel }: QuickLinkFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuickLinkFormData>({
    resolver: zodResolver(quickLinkSchema),
    defaultValues: quickLink
      ? {
          name: quickLink.name,
          url: quickLink.url,
          category: quickLink.category,
          displayOrder: quickLink.displayOrder,
        }
      : {
          category: 'General',
          displayOrder: 0,
        },
  })

  const onSubmit = async (data: QuickLinkFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = quickLink
        ? await updateQuickLink(quickLink.id, data)
        : await createQuickLink(data)
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

      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Online Banking"
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">
          URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="url"
          {...register('url')}
          placeholder="https://..."
        />
        {errors.url && (
          <p className="text-sm text-red-500">{errors.url.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">
            Category <span className="text-red-500">*</span>
          </Label>
          <Input
            id="category"
            {...register('category')}
            placeholder="e.g., Banking, Suppliers"
            list="categories"
          />
          <datalist id="categories">
            <option value="Banking" />
            <option value="Suppliers" />
            <option value="Government" />
            <option value="Utilities" />
            <option value="General" />
          </datalist>
          {errors.category && (
            <p className="text-sm text-red-500">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input
            id="displayOrder"
            type="number"
            {...register('displayOrder', { valueAsNumber: true })}
          />
          {errors.displayOrder && (
            <p className="text-sm text-red-500">{errors.displayOrder.message}</p>
          )}
        </div>
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
            : quickLink
              ? 'Update Link'
              : 'Create Link'}
        </Button>
      </div>
    </form>
  )
}
