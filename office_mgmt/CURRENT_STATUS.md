# Current Implementation Status

**Last Updated:** January 23, 2025  
**Next.js Version:** 16.1.1  
**Database:** PostgreSQL (Vercel/Neon)

---

## 🆕 Latest Updates (Client Requirements)

**Migration Created:** `20260123172608_add_client_requirements`

### Schema Changes Applied:
- ✅ **Client**: Added `referenceCode` field (for invoice code generation)
- ✅ **Employee**: Added `car` field
- ✅ **CompanyAsset**: Added `leaseExpiryDate`, `merseyFlow`, `companyCar` fields
- ✅ **Timesheet**: Added `submittedDate`, `expenses`, `receiptsReceived` fields
- ✅ **BankTransaction**: Added `reconciliationDate`, `reconciledBy`, `linkedTimesheetId`, `documentUrl` fields
- ✅ **Invoice**: Added `supplierId` field for purchase invoices
- ✅ **New Models**: `InvoiceCode`, `Supplier`, `JobPrice`

**Note:** Migration file created. Run `npx prisma migrate deploy` (production) or `npx prisma migrate dev` (development) when DATABASE_URL is configured.

---

## ✅ Completed Features

### 1. Multi-Tenant RBAC System
- ✅ Database schema with `TenantAccount` and `Entity` models
- ✅ Role-based permissions (PLATFORM_ADMIN, ACCOUNT_ADMIN, ENTITY_ADMIN, ENTITY_USER)
- ✅ Permission system with resource-based and module-level permissions
- ✅ Entity scoping for all business data
- ✅ Permission checks in server actions

### 2. Authentication
- ✅ NextAuth.js v5 (beta) integration
- ✅ Credentials provider (email/password - password check disabled for dev)
- ✅ Session management with role, entityId, accountId, and permissions
- ✅ Login page at `/login`
- ✅ Route protection via `app/proxy.ts` (middleware)
- ✅ Dashboard layout with authentication check

### 3. Admin UI
- ✅ Admin landing page (`/admin`)
- ✅ TenantAccount (Organisations) management (`/admin/organisations`)
- ✅ Entity (Companies) management (`/admin/companies`)
- ✅ User management (`/admin/users`)
- ✅ Role-based UI visibility

### 4. CRUD Operations - Clients
- ✅ Server actions: `app/actions/clients.ts`
  - `getClients()`, `getClient(id)`, `createClient()`, `updateClient()`, `deleteClient()`
  - Permission checks and entity scoping
- ✅ Form component: `components/clients/client-form.tsx`
- ✅ Page: `app/(dashboard)/clients/page.tsx`
  - Real data from database
  - Create/Edit dialog
  - Delete with confirmation
  - Search functionality
  - Stats cards

### 5. CRUD Operations - Subcontractors
- ✅ Server actions: `app/actions/subcontractors.ts`
  - `getSubcontractors()`, `getSubcontractor(id)`, `createSubcontractor()`, `updateSubcontractor()`, `deleteSubcontractor()`
  - CIS-specific fields (NI Number, UTR, CIS Status, Verification Number)
  - Email uniqueness check per entity
- ✅ Form component: `components/subcontractors/subcontractor-form.tsx`
- ✅ Page: `app/(dashboard)/subcontractors/page.tsx`
  - Full CRUD with styled dialogs
  - CIS status badges
  - Stats cards

### 6. UI Components
- ✅ Dialog component (`components/ui/dialog.tsx`)
- ✅ AlertDialog component (`components/ui/alert-dialog.tsx`)
- ✅ Toast system (`components/ui/toast.tsx`, `components/ui/toaster.tsx`, `hooks/use-toast.ts`)
- ✅ All integrated into `components/providers.tsx`

### 7. Database Schema Updates
- ✅ Job model updated with:
  - Multiple employees via `JobEmployee` junction table (many-to-many)
  - Job line items via `JobLineItem` model (one-to-many)
  - `jobNumber` field (can be client's reference number)
- ✅ Migration applied: `20260123162952_update_jobs_schema`

---

## 🚧 In Progress / Pending

### 1. Jobs CRUD (Ready to implement)
- Schema updated and migration applied
- Need to create:
  - Server actions: `app/actions/jobs.ts`
  - Form component with:
    - Multiple employee selection (multi-select)
    - Dynamic line items (add/remove rows)
    - Auto-calculate total from line items
  - Page: `app/(dashboard)/jobs/page.tsx`

### 2. Timesheets CRUD
- Pending implementation
- Will need approval workflow

### 3. Invoices CRUD
- Most complex module
- Line items, VAT calculation, CIS deduction
- Sales and Purchase invoices

### 4. Password Management
- Currently disabled for development
- Need to:
  - Add `password` field to User model
  - Hash passwords on creation
  - Verify passwords on login

### 5. Module Toggling
- Infrastructure in place (`TenantAccount.settings` Json field)
- Need to implement:
  - Module configuration utilities
  - Module access checks
  - Admin UI for toggling modules
  - Sidebar filtering

---

## 📋 Important Notes

### Route Protection
- **File Location:** `app/proxy.ts` (NOT at root level - must be inside `/app`)
- Protects all routes except `/login` and `/api/auth`
- Dashboard layout also has server-side check as backup

### Authentication
- Password checking is **disabled** for development
- Any user with valid email in database can log in
- Session includes: `id`, `email`, `name`, `role`, `entityId`, `accountId`, `permissions`

### Permissions
- ENTITY_USER has: read, create, update for most resources
- Delete permissions are admin-only
- Permissions cached in JWT for performance

### Database
- Using Vercel Postgres (Neon)
- Region: London (lhr1) - configured in `vercel.json`
- Prisma Client must be regenerated after schema changes

### Key Files
- **Schema:** `prisma/schema.prisma`
- **Auth:** `app/api/auth/[...nextauth]/route.ts`
- **Middleware:** `app/proxy.ts`
- **RBAC:** `lib/platform-core/rbac/`
- **Multi-tenancy:** `lib/platform-core/multi-tenancy/`

---

## 🎯 Next Steps (Priority Order)

1. **Jobs CRUD** - Schema ready, needs implementation
2. **Timesheets CRUD** - With approval workflow
3. **Invoices CRUD** - Most complex, with line items and calculations
4. **Password Management** - Add hashing and verification
5. **Module Toggling** - Enable/disable modules per tenant

---

## 🔧 Technical Details

### Server Actions Pattern
All server actions follow this pattern:
```typescript
'use server'
- Check authentication
- Check permissions
- Get accessible entity IDs
- Scope data to entities
- Revalidate paths
```

### Form Components Pattern
- Use `react-hook-form` for validation
- Client components with server actions
- Error handling with toast notifications
- Success callbacks to refresh data

### Permission Constants
- Resources: `clients`, `invoices`, `timesheets`, `subcontractors`, `jobs`, etc.
- Actions: `read`, `create`, `update`, `delete`, `approve`
- Modules: `dashboard`, `clients`, `invoices`, `timesheets`, `jobs`, `banking`, `payroll`, etc.

---

## 📝 Known Issues / TODOs

- [ ] Password authentication disabled (development only)
- [ ] Module toggling not implemented
- [ ] Some pages still using mock data (invoices, timesheets, jobs, etc.)
- [ ] Error boundaries not implemented
- [ ] Loading states could be improved
- [ ] No pagination on list pages yet

---

## 🚀 Ready to Continue

The system is in a good state to continue with:
- Jobs CRUD (schema ready)
- Timesheets CRUD
- Invoices CRUD
- Or any other features you'd like to prioritize
