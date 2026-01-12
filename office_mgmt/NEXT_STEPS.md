# Immediate Next Steps to Production

This is a prioritized action plan to get your Office Management System production-ready.

## ⚠️ Important: CRUD Operations Are Missing

**Current State:** All pages (clients, invoices, timesheets, etc.) only **display** mock data. The buttons like "Add Client", "New Invoice", "Edit", and "Delete" are **not functional** - they're just UI elements.

**What Needs to Be Built:**
- Server Actions or API routes for all CRUD operations
- Form components for creating/editing data
- Delete functionality with confirmations
- Connection between UI buttons and backend operations

**This is Week 2's primary focus** after authentication and database are set up.

## 🎯 Week 1: Foundation (Critical)

### Day 1-2: Authentication Setup

**1. Create NextAuth configuration**
```bash
mkdir -p app/api/auth/\[...nextauth\]
```

Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) return null

        // TODO: Implement password hashing check
        // const isValid = await bcrypt.compare(credentials.password, user.password)
        // if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
})
```

**2. Create login page**
Create `app/login/page.tsx` with a login form.

**3. Create middleware for route protection**
Create `middleware.ts` in root:
```typescript
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Redirect logged-in users away from login
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

**4. Install required packages**
```bash
npm install bcryptjs @types/bcryptjs
```

### Day 3-4: Database Setup

**1. Set up production database**
- Sign up for Neon (https://neon.tech) or Vercel Postgres
- Create a new database
- Copy the connection string

**2. Create environment file**
Create `.env.local` (not committed to git):
```env
DATABASE_URL="your-postgres-connection-string"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

**3. Run migrations**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

**4. Seed initial data (optional)**
Create `prisma/seed.ts` to seed an admin user:
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      // Add password field if you add it to schema
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

### Day 5: Replace Mock Data

**1. Update dashboard page**
Replace `lib/mock-data.ts` imports with Prisma queries:
```typescript
// In app/(dashboard)/dashboard/page.tsx
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const invoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { client: true }
  })
  
  // Calculate KPIs from database
  const totalRevenue = await prisma.invoice.aggregate({
    where: { status: 'PAID', type: 'SALES' },
    _sum: { total: true }
  })
  
  // ... rest of the page
}
```

**2. Update all other pages similarly**
- Clients page: `prisma.client.findMany()`
- Invoices page: `prisma.invoice.findMany()`
- Timesheets page: `prisma.timesheet.findMany()`
- etc.

## 🎯 Week 2: Core Features - CRUD Operations

**⚠️ CRITICAL: Currently, all pages display mock data only. No create, update, or delete functionality exists. This must be implemented.**

### Day 1-2: Client CRUD Operations

**1. Create Server Actions for Clients**

Create `app/actions/clients.ts`:
```typescript
'use server'

import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { auth } from "@/app/api/auth/[...nextauth]/route"

const clientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  companyName: z.string().optional(),
  // ... other fields
})

export async function createClient(data: z.infer<typeof clientSchema>) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const validated = clientSchema.parse(data)
  return await prisma.client.create({ data: validated })
}

export async function updateClient(id: string, data: Partial<z.infer<typeof clientSchema>>) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  return await prisma.client.update({
    where: { id },
    data
  })
}

export async function deleteClient(id: string) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }

  return await prisma.client.delete({ where: { id } })
}
```

**2. Create Client Form Component**

Create `components/forms/client-form.tsx`:
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient, updateClient } from '@/app/actions/clients'

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  billingAddress: z.string().optional(),
  vatNumber: z.string().optional(),
  vatRegistered: z.boolean().default(false),
  cisRegistered: z.boolean().default(false),
  paymentTerms: z.number().min(1).max(365).default(30),
  notes: z.string().optional(),
})

export function ClientForm({ client, onSuccess }: { client?: any, onSuccess?: () => void }) {
  const form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: client || {
      vatRegistered: false,
      cisRegistered: false,
      paymentTerms: 30,
    }
  })

  const onSubmit = async (data: z.infer<typeof clientSchema>) => {
    try {
      if (client) {
        await updateClient(client.id, data)
      } else {
        await createClient(data)
      }
      onSuccess?.()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

**3. Update Clients Page to use Server Actions**

Update `app/(dashboard)/clients/page.tsx`:
- Convert to Server Component (remove 'use client')
- Fetch clients from database: `const clients = await prisma.client.findMany()`
- Add dialog/modal for create/edit forms
- Connect "Add Client" button to open form
- Connect "Edit" buttons to open form with client data
- Add delete functionality with confirmation

### Day 3-4: Invoice CRUD Operations

**1. Create Server Actions for Invoices**

Create `app/actions/invoices.ts` with:
- `createInvoice(data)` - Handle line items, VAT calculation, CIS deduction
- `updateInvoice(id, data)`
- `deleteInvoice(id)`
- `markInvoicePaid(id, paymentData)`
- `getInvoice(id)` with relations
- `getInvoices(filters)` with pagination

**2. Create Invoice Form Component**

Create `components/forms/invoice-form.tsx`:
- Dynamic line items (add/remove rows)
- Automatic VAT calculation
- CIS deduction calculation
- Client/subcontractor selection
- Invoice number generation

**3. Update Invoices Page**
- Replace mock data with database queries
- Connect "New Invoice" button
- Connect "Edit", "View", "Delete" buttons
- Add status update functionality

### Day 5: Timesheet CRUD Operations

**1. Create Server Actions for Timesheets**

Create `app/actions/timesheets.ts`:
- `createTimesheet(data)` - Calculate CIS deduction based on subcontractor status
- `approveTimesheet(id, userId)`
- `rejectTimesheet(id, reason)`
- `updateTimesheet(id, data)`

**2. Update Timesheets Page**
- Replace mock data
- Connect approve/reject buttons
- Add manual timesheet entry form

### Week 2 Continued: Remaining CRUD Operations

**Complete CRUD for:**
- Subcontractors (`app/actions/subcontractors.ts`)
- Bank Transactions (`app/actions/bank-transactions.ts`)
- Assets (`app/actions/assets.ts`)
- Quick Links (`app/actions/quick-links.ts`)
- Jobs (`app/actions/jobs.ts`)

**For each entity:**
1. Create server actions file
2. Create form component
3. Update page to use real data
4. Connect all buttons to actions
5. Add delete confirmations
6. Add success/error notifications

### Error Handling

**1. Create global error boundary**
Create `app/error.tsx`:
```typescript
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

**2. Create loading states**
Create `app/(dashboard)/dashboard/loading.tsx`:
```typescript
export default function Loading() {
  return <div>Loading...</div>
}
```

## 🎯 Week 3: Production Hardening

### Security

**1. Update `next.config.ts`**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
```

### Email Integration

**1. Install Resend**
```bash
npm install resend
```

**2. Create email utility**
Create `lib/email.ts`:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInvoiceEmail(to: string, invoiceId: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Your Invoice',
    html: `<p>Your invoice ${invoiceId} is ready.</p>`
  })
}
```

### PDF Generation

**1. Install PDF library**
```bash
npm install @react-pdf/renderer
```

**2. Create invoice PDF template**
Create `lib/invoice-pdf.tsx` and generate PDFs server-side.

## 🎯 Week 4: Testing & Monitoring

### Testing Setup

**1. Install testing dependencies**
```bash
npm install -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom @types/jest
```

**2. Create `jest.config.js`**
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

### Error Tracking

**1. Install Sentry**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## 📋 Quick Reference Commands

```bash
# Development
npm run dev

# Database
npx prisma generate
npx prisma migrate dev
npx prisma studio
npx prisma migrate deploy  # Production

# Build & Test
npm run build
npm start
npm test

# Environment
# Create .env.local with variables from .env.example
```

## 🔗 Essential Resources

- **NextAuth.js Docs**: https://next-auth.js.org
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Deployment**: https://vercel.com/docs

## ⚠️ Critical Reminders

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Always validate user input** - Use Zod schemas
3. **Protect all routes** - Use middleware
4. **Hash passwords** - Use bcrypt
5. **Use environment variables** - Never hardcode secrets
6. **Test migrations** - Always test on staging first
7. **Backup database** - Set up automated backups

---

**Start with Week 1, Day 1** and work through systematically. Each step builds on the previous one.
