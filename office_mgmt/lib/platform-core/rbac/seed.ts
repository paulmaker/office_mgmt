/**
 * Platform Core: RBAC Permission Seeding
 * 
 * Seeds default permissions and role-permission mappings.
 */

import { prisma } from '@/lib/prisma'
import { RESOURCES, ACTIONS, MODULES, ENTITY_USER_PERMISSIONS } from './constants'
import type { Role } from './types'

/**
 * Seed all permissions
 */
export async function seedPermissions() {
  console.log('Seeding permissions...')

  const permissions: Array<{
    resource: string
    action: string
    module: string | null
    description?: string
  }> = []

  // Resource-based permissions
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      permissions.push({
        resource,
        action,
        module: null,
        description: `${action} ${resource}`,
      })
    }
  }

  // Module-based permissions
  for (const module of MODULES) {
    permissions.push({
      resource: '',
      action: '',
      module,
      description: `Access to ${module} module`,
    })
  }

  // Upsert all permissions
  // Use createMany with skipDuplicates for better performance and null handling
  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  })

  // Update descriptions for existing permissions
  for (const perm of permissions) {
    await prisma.permission.updateMany({
      where: {
        resource: perm.resource,
        action: perm.action,
        module: perm.module,
      },
      data: {
        description: perm.description,
      },
    })
  }

  console.log(`Seeded ${permissions.length} permissions`)
}

/**
 * Seed role-permission mappings
 */
export async function seedRolePermissions() {
  console.log('Seeding role permissions...')

  // Get all permissions
  const allPermissions = await prisma.permission.findMany()

  // PLATFORM_ADMIN: All permissions
  await assignPermissionsToRole('PLATFORM_ADMIN', allPermissions.map((p) => p.id))

  // ACCOUNT_ADMIN: All permissions
  await assignPermissionsToRole('ACCOUNT_ADMIN', allPermissions.map((p) => p.id))

  // ENTITY_ADMIN: All permissions
  await assignPermissionsToRole('ENTITY_ADMIN', allPermissions.map((p) => p.id))

  // ENTITY_USER: Specific permissions
  const entityUserPermissionIds: string[] = []

  for (const perm of ENTITY_USER_PERMISSIONS) {
    if (perm.module) {
      // Module permission
      const modulePerm = allPermissions.find(
        (p) => !p.resource && !p.action && p.module === perm.module
      )
      if (modulePerm) {
        entityUserPermissionIds.push(modulePerm.id)
      }
    } else {
      // Resource permission
      const resourcePerm = allPermissions.find(
        (p) => p.resource === perm.resource && p.action === perm.action
      )
      if (resourcePerm) {
        entityUserPermissionIds.push(resourcePerm.id)
      }
    }
  }

  await assignPermissionsToRole('ENTITY_USER', entityUserPermissionIds)

  console.log('Seeded role permissions')
}

/**
 * Assign permissions to a role
 */
async function assignPermissionsToRole(role: Role, permissionIds: string[]) {
  // Remove existing permissions for this role
  await prisma.rolePermission.deleteMany({
    where: { role },
  })

  // Add new permissions
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role,
          permissionId,
        },
      },
      update: {},
      create: {
        role,
        permissionId,
      },
    })
  }
}

/**
 * Run all seed functions
 */
export async function seedRBAC() {
  await seedPermissions()
  await seedRolePermissions()
  console.log('RBAC seeding complete!')
}
