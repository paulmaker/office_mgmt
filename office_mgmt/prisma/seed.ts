/**
 * Prisma Seed Script
 *
 * Seeds the database with:
 * - All permissions (resource-based and module-based)
 * - Role-permission mappings
 *
 * Production mode (SEED_PRODUCTION=1):
 * - One TenantAccount and Entity
 * - One initial Platform Admin user with hashed password (env: INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, INITIAL_ADMIN_PASSWORD)
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { seedRBAC } from '../lib/platform-core/rbac/seed'

const prisma = new PrismaClient()

const isProductionSeed = process.env.SEED_PRODUCTION === '1'

async function seedProduction() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim()
  const name = process.env.INITIAL_ADMIN_NAME?.trim() || 'Platform Admin'
  const password = process.env.INITIAL_ADMIN_PASSWORD?.trim()

  if (!email) {
    console.warn('⚠️  SEED_PRODUCTION=1 but INITIAL_ADMIN_EMAIL is not set. Skipping production user/org seed.')
    return
  }
  if (!password || password.length < 8) {
    console.warn('⚠️  INITIAL_ADMIN_PASSWORD must be set and at least 8 characters. Skipping production user seed.')
    return
  }

  const orgName = process.env.INITIAL_ORG_NAME?.trim() || 'Production Organisation'
  const orgSlug = process.env.INITIAL_ORG_SLUG?.trim() || 'production'
  const entityName = process.env.INITIAL_ENTITY_NAME?.trim() || 'Production Company'
  const entitySlug = process.env.INITIAL_ENTITY_SLUG?.trim() || 'production'

  console.log('🏢 Creating production TenantAccount and Entity...')
  const tenantAccount = await prisma.tenantAccount.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: orgName,
      slug: orgSlug,
      isActive: true,
      entities: {
        create: {
          name: entityName,
          slug: entitySlug,
          isActive: true,
        },
      },
    },
    include: { entities: true },
  })

  let entity = tenantAccount.entities[0] ?? null
  if (!entity) {
    entity = await prisma.entity.upsert({
      where: {
        tenantAccountId_slug: { tenantAccountId: tenantAccount.id, slug: entitySlug },
      },
      update: {},
      create: {
        tenantAccountId: tenantAccount.id,
        name: entityName,
        slug: entitySlug,
        isActive: true,
      },
    })
  }
  console.log('✅ TenantAccount:', tenantAccount.name)
  console.log('✅ Entity:', entity.name)

  console.log('👤 Creating initial Platform Admin user...')
  const hashedPassword = await hash(password, 12)
  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name: name || undefined,
      password: hashedPassword,
      entityId: entity.id,
      role: 'PLATFORM_ADMIN',
      isActive: true,
    },
    create: {
      email: email.toLowerCase(),
      name: name || null,
      password: hashedPassword,
      entityId: entity.id,
      role: 'PLATFORM_ADMIN',
      isActive: true,
    },
  })
  console.log('✅ Initial admin created:', email)
}

async function main() {
  console.log('🌱 Starting database seed...\n')

  console.log('📋 Seeding RBAC system...')
  await seedRBAC()
  console.log('✅ RBAC system seeded\n')

  if (isProductionSeed) {
    await seedProduction()
  }

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
