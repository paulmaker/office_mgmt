'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasPermission } from '@/lib/platform-core/rbac'
import { getUserEntity, getAccessibleEntityIds } from '@/lib/platform-core/multi-tenancy'
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

  // Get accessible entity IDs
  const entityIds = await getAccessibleEntityIds(userId)

  if (entityIds.length === 0) {
    return []
  }

  // Fetch employees scoped to accessible entities
  const employees = await prisma.employee.findMany({
    where: {
      entityId: {
        in: entityIds,
      },
    },
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

  // Verify user can access this employee's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(employee.entityId)) {
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
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canCreate = await hasPermission(userId, 'employees', 'create')
  if (!canCreate) {
    throw new Error('You do not have permission to create employees')
  }

  // Get user's entity
  const userEntity = await getUserEntity(userId)
  if (!userEntity) {
    throw new Error('User entity not found')
  }

  // Check if email already exists in this entity (if provided)
  if (data.email) {
    const existing = await prisma.employee.findFirst({
      where: {
        entityId: userEntity.entityId,
        email: data.email,
      },
    })

    if (existing) {
      throw new Error('An employee with this email already exists')
    }
  }

  // Check if employeeId already exists in this entity (if provided)
  if (data.employeeId) {
    const existing = await prisma.employee.findFirst({
      where: {
        entityId: userEntity.entityId,
        employeeId: data.employeeId,
      },
    })

    if (existing) {
      throw new Error('An employee with this employee ID already exists')
    }
  }

  // Create employee scoped to user's entity
  const employee = await prisma.employee.create({
    data: {
      entityId: userEntity.entityId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      employeeId: data.employeeId,
      car: data.car,
      notes: data.notes,
    },
  })

  revalidatePath('/employees')
  return employee
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
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check permission
  const canUpdate = await hasPermission(userId, 'employees', 'update')
  if (!canUpdate) {
    throw new Error('You do not have permission to update employees')
  }

  // Get the existing employee
  const existingEmployee = await prisma.employee.findUnique({
    where: { id },
  })

  if (!existingEmployee) {
    throw new Error('Employee not found')
  }

  // Verify user can access this employee's entity
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingEmployee.entityId)) {
    throw new Error('You do not have permission to update this employee')
  }

  // If email is being changed, check for duplicates
  if (data.email && data.email !== existingEmployee.email) {
    const duplicate = await prisma.employee.findFirst({
      where: {
        entityId: existingEmployee.entityId,
        email: data.email,
        id: { not: id },
      },
    })

    if (duplicate) {
      throw new Error('An employee with this email already exists')
    }
  }

  // If employeeId is being changed, check for duplicates
  if (data.employeeId && data.employeeId !== existingEmployee.employeeId) {
    const duplicate = await prisma.employee.findFirst({
      where: {
        entityId: existingEmployee.entityId,
        employeeId: data.employeeId,
        id: { not: id },
      },
    })

    if (duplicate) {
      throw new Error('An employee with this employee ID already exists')
    }
  }

  // Update employee
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
  return employee
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
  const entityIds = await getAccessibleEntityIds(userId)
  if (!entityIds.includes(existingEmployee.entityId)) {
    throw new Error('You do not have permission to delete this employee')
  }

  // Delete employee
  await prisma.employee.delete({
    where: { id },
  })

  revalidatePath('/employees')
}
