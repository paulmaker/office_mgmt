/**
 * Prisma Seed Script
 * 
 * Seeds the database with:
 * - All permissions (resource-based and module-based)
 * - Role-permission mappings
 * - Initial Platform Admin user (optional)
 * - Sample TenantAccount and Entity (optional)
 */

import { PrismaClient } from '@prisma/client'
import { seedRBAC } from '../lib/platform-core/rbac/seed'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...\n')

  // Seed RBAC system (permissions and role-permission mappings)
  console.log('📋 Seeding RBAC system...')
  await seedRBAC()
  console.log('✅ RBAC system seeded\n')

  // Optional: Create initial Platform Admin user
  // Uncomment and modify as needed:
  /*
  console.log('👤 Creating initial Platform Admin user...')
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
      isActive: true,
      // Note: You'll need to create an Entity first, or update this after creating one
      // entityId: 'your-entity-id-here',
    },
  })
  console.log('✅ Platform Admin created:', platformAdmin.email)
  */

  // Optional: Create sample TenantAccount and Entity
  // Uncomment and modify as needed:
  /*
  console.log('🏢 Creating sample TenantAccount and Entity...')
  const tenantAccount = await prisma.tenantAccount.create({
    data: {
      name: 'Demo Organisation',
      slug: 'demo-org',
      isActive: true,
      entities: {
        create: {
          name: 'Demo Company',
          slug: 'demo-company',
          isActive: true,
        },
      },
    },
    include: {
      entities: true,
    },
  })
  console.log('✅ Created TenantAccount:', tenantAccount.name)
  console.log('✅ Created Entity:', tenantAccount.entities[0].name)
  */

  console.log('\n✨ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
