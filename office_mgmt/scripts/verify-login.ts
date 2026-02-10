/**
 * Verify that the seeded user can log in against the current DATABASE_URL.
 * Run with production env so we use the same DB you seeded:
 *
 *   npx dotenv-cli -e .env.production -- npx tsx scripts/verify-login.ts
 *
 * If this script says "Password matches" but the app still rejects login,
 * the app is using a different DATABASE_URL (e.g. .env.local when you run next dev).
 */

import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim()?.toLowerCase()
  const password = process.env.INITIAL_ADMIN_PASSWORD?.trim()

  console.log('Database URL (hidden):', process.env.DATABASE_URL ? '***set***' : 'NOT SET')
  console.log('INITIAL_ADMIN_EMAIL:', email ?? 'NOT SET')
  console.log('INITIAL_ADMIN_PASSWORD length:', password ? password.length : 0)
  console.log('')

  if (!email || !password) {
    console.error('Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in the same env file (e.g. .env.production).')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { entity: { select: { name: true } } },
  })

  if (!user) {
    console.error('No user found with email:', email)
    console.error('This DB has no matching user. Either you seeded a different database, or the seed did not create this user.')
    process.exit(1)
  }

  console.log('User found:', user.email, '| Entity:', user.entity?.name ?? 'none')
  console.log('Has password column:', user.password != null ? 'yes' : 'NO (column missing or null)')

  if (!user.password) {
    console.error('User has no password set. Re-run the seed with SEED_PRODUCTION=1 and INITIAL_ADMIN_PASSWORD set.')
    process.exit(1)
  }

  const isValid = await compare(password, user.password)
  if (!isValid) {
    console.error('Password does NOT match. The value in INITIAL_ADMIN_PASSWORD does not match the stored hash.')
    console.error('Re-run the seed with the correct INITIAL_ADMIN_PASSWORD, then try again.')
    process.exit(1)
  }

  console.log('')
  console.log('Password matches. Credentials are correct for this database.')
  console.log('')
  console.log('If the app still says "Invalid email or password", the app is NOT using this database.')
  console.log('When you run "npm run dev", Next.js loads .env / .env.local, not .env.production.')
  console.log('Either: run the app with production env, or point .env.local DATABASE_URL at this DB to test.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())