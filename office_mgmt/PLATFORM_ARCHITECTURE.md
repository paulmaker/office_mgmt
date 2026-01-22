# Platform Architecture - Generic Multi-Tenant System

## Executive Summary

**Recommendation: Refactor, Don't Start Fresh**

You're at the **perfect stage** to build multi-tenancy:
- ✅ Schema exists but no business logic yet
- ✅ UI exists but only displays mock data
- ✅ No CRUD operations to rewrite
- ✅ No data migration needed

**This is the ideal time to build it right from the start.**

---

## Architecture Philosophy

### Core Principle: "Platform Core + Business Modules"

Build a **generic platform core** that handles:
- Multi-tenancy (Account → Entity)
- RBAC (Roles & Permissions)
- Authentication
- Data scoping/isolation

Then build **business modules** on top:
- Clients, Invoices, Timesheets, etc.
- Each module uses the platform core
- Modules can be enabled/disabled per tenant

This approach:
- ✅ Keeps complexity manageable
- ✅ Makes it resellable (different clients = different modules)
- ✅ Allows gradual feature rollout
- ✅ Maintains clean separation of concerns

---

## Terminology Strategy

### Internal (Code/Database)
- `Account` - Top-level tenant
- `Entity` - Sub-organization within Account
- `User` - User belonging to one Entity

### External (UI/Marketing)
- `Organisation` - What users see for Account
- `Company` - What users see for Entity

**Implementation:** Simple translation layer in UI components and API responses.

```typescript
// lib/terminology.ts
export const TERMINOLOGY = {
  account: {
    internal: 'Account',
    external: 'Organisation',
  },
  entity: {
    internal: 'Entity',
    external: 'Company',
  },
} as const

// Usage in UI
const displayName = TERMINOLOGY.account.external // "Organisation"
```

**Why this works:**
- Code stays generic and reusable
- UI can be customized per client
- Easy to change terminology without code changes
- Can even be configurable per Account (white-label)

---

## Platform Core Architecture

### Layer 1: Foundation (Generic, Reusable)

```
platform-core/
├── multi-tenancy/
│   ├── account.ts          # Account management
│   ├── entity.ts           # Entity management
│   └── scoping.ts          # Data scoping utilities
├── rbac/
│   ├── roles.ts            # Role definitions
│   ├── permissions.ts      # Permission system
│   ├── checks.ts           # Permission checking
│   └── seed.ts             # Default permissions
├── auth/
│   ├── session.ts          # Session management
│   ├── middleware.ts       # Route protection
│   └── context.ts          # User context
└── terminology/
    └── i18n.ts             # Terminology translation
```

### Layer 2: Business Modules (Domain-Specific)

```
modules/
├── clients/
│   ├── schema.prisma       # Client model (with entityId)
│   ├── actions.ts          # CRUD operations
│   └── components/         # UI components
├── invoices/
│   ├── schema.prisma
│   ├── actions.ts
│   └── components/
└── ...
```

**Key Point:** Each module is **independent** but uses the **platform core** for:
- Data scoping (automatic entityId filtering)
- Permission checks
- User context

---

## Database Schema Design

### Platform Core Models

```prisma
// Platform-level: Account (Organisation in UI)
model TenantAccount {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  isActive    Boolean  @default(true)
  settings    Json?    // Tenant-specific settings
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  entities    Entity[]
  createdBy   String?  // Platform Admin ID
}

// Sub-organization: Entity (Company in UI)
model Entity {
  id          String   @id @default(cuid())
  tenantAccountId String
  name        String
  slug        String   // Unique within TenantAccount
  isActive    Boolean  @default(true)
  settings    Json?    // Entity-specific settings
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tenantAccount TenantAccount @relation(fields: [tenantAccountId], references: [id], onDelete: Cascade)
  users         User[]
  // Business models reference entityId
}

// User with entity relationship
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  entityId      String    // Belongs to one Entity
  role          Role      @default(ENTITY_USER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  entity        Entity    @relation(fields: [entityId], references: [id])
  authAccounts  AuthAccount[] // NextAuth accounts (renamed)
  sessions      Session[]
}

// Permission system
model Permission {
  id          String   @id @default(cuid())
  resource    String   // "clients", "invoices", etc.
  action      String   // "read", "create", "update", "delete"
  module      String?  // "banking", "payroll", etc.
  description String?
  
  rolePermissions RolePermission[]
  
  @@unique([resource, action, module])
}

model RolePermission {
  id           String     @id @default(cuid())
  role         Role
  permissionId String
  createdAt    DateTime   @default(now())
  
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([role, permissionId])
}

enum Role {
  PLATFORM_ADMIN
  ACCOUNT_ADMIN
  ENTITY_ADMIN
  ENTITY_USER
}
```

### Business Model Pattern

**Every business model follows this pattern:**

```prisma
model Client {
  id          String   @id @default(cuid())
  entityId   String   // REQUIRED: Scoped to Entity
  // ... business fields ...
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  entity      Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  
  @@index([entityId]) // Performance: Always index entityId
}
```

**Benefits:**
- Automatic data isolation
- Easy to query by entity
- Cascade delete when entity is deleted
- Performance optimized

---

## Implementation Strategy

### Phase 1: Platform Core (Week 1-2)

1. **Schema Updates**
   - Add `TenantAccount` and `Entity` models
   - Add `entityId` to all business models
   - Add Permission and RolePermission models
   - Rename NextAuth `Account` to `AuthAccount` (avoid conflict)

2. **Platform Core Library**
   - Multi-tenancy utilities
   - RBAC system
   - Permission checking
   - Data scoping helpers

3. **Authentication Updates**
   - Update NextAuth to include entity context
   - Add role/permissions to session
   - Update middleware for route protection

4. **Terminology Layer**
   - Create translation utilities
   - Update UI to use external terminology

### Phase 2: Business Modules (Week 3+)

1. **Build Each Module Using Platform Core**
   - All CRUD operations automatically scoped to entity
   - Permission checks on every operation
   - UI components use platform utilities

2. **Module Pattern**
   ```typescript
   // modules/clients/actions.ts
   import { requirePermission, scopeToEntity } from '@/platform-core'
   
   export async function createClient(data: CreateClientInput) {
     const session = await getSession()
     
     // Permission check
     await requirePermission('clients', 'create')
     
     // Automatic entity scoping
     return prisma.client.create({
       data: {
         ...data,
         entityId: session.user.entityId, // Auto-scoped
       },
     })
   }
   ```

---

## Complexity Management

### What Makes It Generic (Without Over-Engineering)

✅ **DO:**
- Build platform core as reusable library
- Use consistent patterns across modules
- Abstract common operations (CRUD, permissions, scoping)
- Keep terminology configurable

❌ **DON'T:**
- Build a full "plugin system" (too complex for MVP)
- Abstract everything (some business logic should stay concrete)
- Over-engineer the permission system (start simple, extend later)
- Make it too configurable (YAGNI - You Aren't Gonna Need It)

### Complexity Sweet Spot

**Current Approach:**
- Generic enough: Platform core is reusable
- Simple enough: Business modules are straightforward
- Extensible: Can add custom roles, permissions later
- Maintainable: Clear separation of concerns

**Not Building:**
- Full plugin architecture
- Dynamic schema generation
- Code generation from config
- Overly abstracted query builders

---

## Resellability Strategy

### White-Label Capabilities

1. **Terminology Customization**
   - Each Account can have custom terminology
   - Stored in `TenantAccount.settings`
   - Applied via translation layer

2. **Module Enablement**
   - Each Account can enable/disable modules
   - Stored in `TenantAccount.settings.modules`
   - UI shows/hides based on enabled modules

3. **Branding**
   - Logo, colors, theme per Account
   - Stored in `TenantAccount.settings.branding`
   - Applied via CSS variables

4. **Custom Permissions** (Future)
   - Custom roles per Account
   - Custom permission sets
   - Role templates

### Example: Different Clients, Same Platform

**Client A (Construction Company):**
- Modules: Clients, Invoices, Timesheets, Jobs
- Terminology: Organisation → Company
- Branding: Blue theme, Construction logo

**Client B (Accounting Firm):**
- Modules: Clients, Invoices, Banking, Reports
- Terminology: Organisation → Firm
- Branding: Green theme, Accounting logo

**Same codebase, different configuration.**

---

## Migration Path

### Step 1: Schema Migration
```sql
-- Create new tables
CREATE TABLE "TenantAccount" ...
CREATE TABLE "Entity" ...
-- Add entityId to existing tables
ALTER TABLE "Client" ADD COLUMN "entityId" ...
-- Create default Entity for existing data
INSERT INTO "Entity" ...
-- Migrate users
UPDATE "User" SET "entityId" = <default-entity-id>
```

### Step 2: Code Updates
- Update all queries to include entityId
- Add permission checks
- Update UI with terminology layer

### Step 3: Testing
- Test data isolation
- Test permission system
- Test multi-tenant scenarios

---

## File Structure

```
office_mgmt/
├── platform-core/              # Generic, reusable platform
│   ├── multi-tenancy/
│   ├── rbac/
│   ├── auth/
│   └── terminology/
├── modules/                     # Business-specific modules
│   ├── clients/
│   ├── invoices/
│   ├── timesheets/
│   └── ...
├── app/
│   ├── (dashboard)/            # UI pages
│   └── api/
├── prisma/
│   └── schema.prisma            # Combined schema
└── lib/
    └── utils.ts
```

---

## Risk Assessment

### Low Risk ✅
- Adding `entityId` to models (straightforward)
- Building permission system (well-understood pattern)
- Terminology layer (simple translation)

### Medium Risk ⚠️
- Data migration (needs careful testing)
- Permission checks everywhere (needs discipline)
- Multi-tenant query performance (needs indexing)

### Mitigation
- Start with single Entity per Account (simpler)
- Add multi-Entity support later
- Use Prisma middleware for automatic scoping
- Comprehensive testing before production

---

## Next Steps

1. **Review this architecture** - Confirm approach
2. **Update RBAC plan** - Incorporate terminology strategy
3. **Start implementation** - Begin with platform core
4. **Build incrementally** - One module at a time

---

## Questions Answered

**Q: Should I start fresh?**
**A: No.** You're at the perfect stage to refactor. No business logic to rewrite.

**Q: Will it get too complicated?**
**A: No, if we follow this architecture.** Platform core is generic but not over-engineered. Business modules stay simple.

**Q: Terminology concern?**
**A: Solved.** Internal vs external terminology with translation layer. Can even be configurable per tenant.

**Q: Resellability?**
**A: Yes.** Platform core is generic. Business modules can be enabled/disabled. Terminology and branding customizable.
