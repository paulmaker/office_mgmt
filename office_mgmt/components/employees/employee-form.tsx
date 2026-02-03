'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEmployee, updateEmployee } from '@/app/actions/employees'
import { getVehicles } from '@/app/actions/assets'
import type { Employee, CompanyAsset } from '@prisma/client'

interface EmployeeFormData {
  name: string
  email?: string
  phone?: string
  employeeId?: string
  car?: string
  notes?: string
}

interface EmployeeFormProps {
  employee?: Employee | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<CompanyAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setIsLoading(true)
        const vehicleList = await getVehicles()
        setVehicles(vehicleList)
      } catch (err) {
        console.error('Failed to load vehicles:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadVehicles()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    defaultValues: employee
      ? {
          name: employee.name,
          email: employee.email || '',
          phone: employee.phone || '',
          employeeId: employee.employeeId || '',
          car: employee.car || '',
          notes: employee.notes || '',
        }
      : {},
  })

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = employee
        ? await updateEmployee(employee.id, data)
        : await createEmployee(data)
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
          <Label htmlFor="employeeId">Employee ID</Label>
          <Input id="employeeId" {...register('employeeId')} />
          {errors.employeeId && (
            <p className="text-sm text-red-500">{errors.employeeId.message}</p>
          )}
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
        <Label htmlFor="car">Vehicle Allocation</Label>
        {isLoading ? (
          <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
        ) : vehicles.length > 0 ? (
          <select
            id="car"
            {...register('car')}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="">No vehicle allocated</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={`${vehicle.name}${vehicle.registrationNumber ? ` (${vehicle.registrationNumber})` : ''}`}>
                {vehicle.name}{vehicle.registrationNumber ? ` (${vehicle.registrationNumber})` : ''}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id="car"
            {...register('car')}
            placeholder="e.g., Ford Transit, VW Golf"
          />
        )}
        {errors.car && (
          <p className="text-sm text-red-500">{errors.car.message}</p>
        )}
        {vehicles.length === 0 && !isLoading && (
          <p className="text-xs text-gray-500">
            No vehicles found. Add vehicles in Assets to enable dropdown selection.
          </p>
        )}
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
            : employee
              ? 'Update Employee'
              : 'Create Employee'}
        </Button>
      </div>
    </form>
  )
}
