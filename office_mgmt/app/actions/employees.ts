'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { requireSessionEntityId } from '@/lib/session-entity'
import { revalidatePath } from 'next/cache'

/**
 * Get all employees for the current user's accessible entities
 */
export async function getEmployees() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'employees', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view employees')
  }

  const entityId = requireSessionEntityId(session)

  const employees = await prisma.employee.findMany({
    where: { entityId },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return employees
}

/**
 * Get a single employee by ID
 */
export async function getEmployee(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canRead = await hasPermission(userId, 'employees', 'read')
  if (!canRead) {
    throw new Error('You do not have permission to view employees')
  }

  // Get the employee
  const employee = await prisma.employee.findUnique({
    where: { id },
  })

  if (!employee) {
    throw new Error('Employee not found')
  }

  const entityId = requireSessionEntityId(session)
  if (employee.entityId !== entityId) {
    throw new Error('You do not have permission to access this employee')
  }

  return employee
}

/**
 * Create a new employee
 */
export async function createEmployee(data: {
  name: string
  email?: string
  phone?: string
  employeeId?: string
  car?: string
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canCreate = await hasPermission(userId, 'employees', 'create')
    if (!canCreate) return { success: false, error: 'You do not have permission to create employees' }

    const entityId = requireSessionEntityId(session)

    if (data.email) {
      const existing = await prisma.employee.findFirst({
        where: { entityId, email: data.email },
      })
      if (existing) return { success: false, error: 'An employee with this email already exists' }
    }

    if (data.employeeId) {
      const existing = await prisma.employee.findFirst({
        where: { entityId, employeeId: data.employeeId },
      })
      if (existing) return { success: false, error: 'An employee with this employee ID already exists' }
    }

    const employee = await prisma.employee.create({
      data: {
        entityId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        employeeId: data.employeeId,
        car: data.car,
        notes: data.notes,
      },
    })

    revalidatePath('/employees')
    return { success: true, data: employee }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
}

/**
 * Update an existing employee
 */
export async function updateEmployee(
  id: string,
  data: {
    name?: string
    email?: string
    phone?: string
    employeeId?: string
    car?: string
    notes?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthorized' }

    const userId = session.user.id as string
    const canUpdate = await hasPermission(userId, 'employees', 'update')
    if (!canUpdate) return { success: false, error: 'You do not have permission to update employees' }

    const existingEmployee = await prisma.employee.findUnique({ where: { id } })
    if (!existingEmployee) return { success: false, error: 'Employee not found' }

    const entityId = requireSessionEntityId(session)
    if (existingEmployee.entityId !== entityId)
      return { success: false, error: 'You do not have permission to update this employee' }

    if (data.email && data.email !== existingEmployee.email) {
      const duplicate = await prisma.employee.findFirst({
        where: { entityId: existingEmployee.entityId, email: data.email, id: { not: id } },
      })
      if (duplicate) return { success: false, error: 'An employee with this email already exists' }
    }

    if (data.employeeId && data.employeeId !== existingEmployee.employeeId) {
      const duplicate = await prisma.employee.findFirst({
        where: { entityId: existingEmployee.entityId, employeeId: data.employeeId, id: { not: id } },
      })
      if (duplicate) return { success: false, error: 'An employee with this employee ID already exists' }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        employeeId: data.employeeId,
        car: data.car,
        notes: data.notes,
      },
    })

    revalidatePath('/employees')
    revalidatePath(`/employees/${id}`)
    return { success: true, data: employee }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'An unexpected error occurred' }
  }
}

/**
 * Delete an employee
 */
export async function deleteEmployee(id: string) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission (delete is typically admin-only)
  const canDelete = await hasPermission(userId, 'employees', 'delete')
  if (!canDelete) {
    throw new Error('You do not have permission to delete employees')
  }

  // Get the existing employee
  const existingEmployee = await prisma.employee.findUnique({
    where: { id },
  })

  if (!existingEmployee) {
    throw new Error('Employee not found')
  }

  // Verify user can access this employee's entity
  const entityId = requireSessionEntityId(session)
  if (existingEmployee.entityId !== entityId) {
    throw new Error('You do not have permission to delete this employee')
  }

  // Delete employee
  await prisma.employee.delete({
    where: { id },
  })

  revalidatePath('/employees')
}
