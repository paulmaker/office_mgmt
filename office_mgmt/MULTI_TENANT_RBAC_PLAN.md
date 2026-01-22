# Multi-Tenant Role & Permission System - Implementation Plan

## Overview

This document outlines the implementation plan for a modular, reusable multi-tenant role-based access control (RBAC) system. The system will support:
- **TenantAccount** (top-level organization/company) - displayed as "Organisation" in UI
- **Entity** (sub-organizations/departments within a TenantAccount) - displayed as "Company" in UI
- **Users** (belonging to one Entity)
- **Roles** (predefined for MVP, extensible for custom roles later)
- **Permissions** (resource-based and module-level)

### Architecture Approach

This system follows a **"Platform Core + Business Modules"** architecture:
- **Platform Core**: Generic multi-tenancy, RBAC, authentication (reusable across projects)
- **Business Modules**: Domain-specific features (clients, invoices, etc.) built on top of platform core

This approach ensures:
- ✅ Generic enough to resell to different clients
- ✅ Simple enough to maintain and extend
- ✅ Clean separation between platform and business logic
- ✅ Terminology customization (internal vs external naming)

See `PLATFORM_ARCHITECTURE.md` for detailed architecture documentation.

---

## Architecture Overview

### Hierarchy Structure
```
Account (Top Level)
  ├── Entity 1
  │   ├── User 1 (with Role)
  │   ├── User 2 (with Role)
  │   └── Data (Clients, Invoices, etc.)
  ├── Entity 2
  │   ├── User 3 (with Role)
  │   └── Data
  └── Entity 3
      └── ...
```

### Role Hierarchy
1. **Platform Admin** - Super-admin across all TenantAccounts (system-level)
2. **Account Admin** - Admin for a specific TenantAccount (can manage all Entities within Account)
3. **Entity Admin** - Admin for a specific Entity (can manage users and data within Entity)
4. **Entity User** - Regular user within an Entity (permissions based on role)

### Terminology Strategy
- **Internal (Code/Database):** `TenantAccount` → `Entity`
- **External (UI):** `Organisation` → `Company`
- Implementation: Translation layer in UI components and API responses
- Can be customized per TenantAccount via `settings.terminology`

---

## MVP Scope (Phase 1)

### 1. Database Schema Changes

#### New Models

**TenantAccount Model** (Note: Renamed from "Account" to avoid conflict with NextAuth Account)
```prisma
model TenantAccount {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique // URL-friendly identifier
  isActive    Boolean  @default(true)
  settings    Json?    // Tenant-specific settings (terminology, branding, modules)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  entities    Entity[]
  createdBy   String?  // Platform Admin who created it
}
```

**Entity Model**
```prisma
model Entity {
  id              String   @id @default(cuid())
  tenantAccountId String
  name            String
  slug            String   // Unique within TenantAccount
  isActive        Boolean  @default(true)
  settings        Json?    // Entity-specific settings
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  tenantAccount   TenantAccount @relation(fields: [tenantAccountId], references: [id], onDelete: Cascade)
  users           User[]
  // All business data will reference entityId
}
```

**User Model Updates**
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  entityId      String    // User belongs to one Entity
  role          Role      @default(ENTITY_USER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  entity        Entity    @relation(fields: [entityId], references: [id])
  authAccounts  AuthAccount[] // NextAuth accounts (renamed to avoid conflict)
  sessions      Session[]
}
```

**Role Enum**
```prisma
enum Role {
  PLATFORM_ADMIN  // System-wide admin
  ACCOUNT_ADMIN   // Account-level admin
  ENTITY_ADMIN    // Entity-level admin
  ENTITY_USER     // Regular user (will have permissions assigned)
}
```

**Permission Model**
```prisma
model Permission {
  id          String   @id @default(cuid())
  resource    String   // e.g., "clients", "invoices", "timesheets"
  action      String   // e.g., "read", "create", "update", "delete"
  module      String?  // e.g., "banking", "payroll", "reports"
  description String?
  
  rolePermissions RolePermission[]
  
  @@unique([resource, action, module])
}
```

**RolePermission Model** (Many-to-Many: Role -> Permissions)
```prisma
model RolePermission {
  id           String     @id @default(cuid())
  role         Role
  permissionId String
  createdAt    DateTime   @default(now())
  
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([role, permissionId])
}
```

#### Business Model Updates

All business models will add `entityId` field:
- `Client.entityId`
- `Invoice.entityId`
- `Timesheet.entityId`
- `Subcontractor.entityId`
- `BankTransaction.entityId`
- `CompanyAsset.entityId`
- `Job.entityId`
- `Employee.entityId`
- `VATReturn.entityId`
- `CISReturn.entityId`
- `QuickLink.entityId`

**Note:** NextAuth's `Account` model has been renamed to `AuthAccount` in the schema to avoid conflicts.

---

### 2. Permission Structure

#### Resources (Data Entities)
- `clients`
- `invoices`
- `timesheets`
- `subcontractors`
- `bank_transactions`
- `assets`
- `jobs`
- `employees`
- `vat_returns`
- `cis_returns`
- `quick_links`

#### Actions
- `read` - View/list records
- `create` - Create new records
- `update` - Edit existing records
- `delete` - Delete records
- `approve` - Approve records (for timesheets, invoices, etc.)
- `export` - Export data (for reports)

#### Modules
- `dashboard` - Access to dashboard
- `clients` - Clients module
- `invoices` - Invoices module
- `timesheets` - Timesheets module
- `jobs` - Jobs module
- `banking` - Banking module
- `payroll` - Payroll module
- `reports` - Reports module
- `assets` - Assets module
- `settings` - Settings module
- `quick_links` - Quick Links module

#### Permission Format
- Resource-based: `{resource}:{action}` (e.g., `clients:read`, `invoices:create`)
- Module-based: `module:{module_name}` (e.g., `module:banking`, `module:reports`)

---

### 3. Predefined Role Permissions (MVP)

#### PLATFORM_ADMIN
- All permissions across all Accounts
- Can create/manage Accounts
- Can assign Account Admins
- No restrictions

#### ACCOUNT_ADMIN
- All permissions within their Account
- Can create/manage Entities within Account
- Can assign Entity Admins
- Can manage all users within Account
- All resource permissions: `*:*` (all resources, all actions)
- All module permissions: `module:*`

#### ENTITY_ADMIN
- All permissions within their Entity
- Can manage users within Entity
- Can assign roles to users within Entity
- All resource permissions: `*:*` (scoped to Entity)
- All module permissions: `module:*`

#### ENTITY_USER
- **Default permissions (Read + Create for most resources):**
  - `clients:read`, `clients:create`, `clients:update`
  - `invoices:read`, `invoices:create`
  - `timesheets:read`, `timesheets:create`
  - `jobs:read`, `jobs:create`, `jobs:update`
  - `subcontractors:read`, `subcontractors:create`
  - `employees:read`, `employees:create`
  - `assets:read`
  - `bank_transactions:read`
  - `module:dashboard`, `module:clients`, `module:invoices`, `module:timesheets`, `module:jobs`
- **Restrictions:**
  - No `delete` permissions (reserved for admins)
  - No `approve` permissions (reserved for admins)
  - No access to `settings` module
  - No access to `reports` module (can be granted via custom roles later)

---

### 4. Core Library Functions

#### Permission Check Utilities (`lib/permissions.ts`)

```typescript
// Check if user has specific permission
export async function hasPermission(
  userId: string,
  resource: string,
  action: string,
  module?: string
): Promise<boolean>

// Check if user has module access
export async function hasModuleAccess(
  userId: string,
  module: string
): Promise<boolean>

// Get user's effective permissions
export async function getUserPermissions(
  userId: string
): Promise<Permission[]>

// Check if user is Platform Admin
export async function isPlatformAdmin(userId: string): Promise<boolean>

// Check if user is Account Admin
export async function isAccountAdmin(userId: string, accountId: string): Promise<boolean>

// Check if user is Entity Admin
export async function isEntityAdmin(userId: string, entityId: string): Promise<boolean>

// Get user's entity context
export async function getUserEntity(userId: string): Promise<{ entityId: string, accountId: string } | null>
```

#### Data Scoping Utilities (`lib/data-scoping.ts`)

```typescript
// Add entity filter to Prisma query
export function scopeToEntity<T>(
  query: any,
  entityId: string
): T

// Verify user can access entity
export async function canAccessEntity(
  userId: string,
  entityId: string
): Promise<boolean>

// Get user's accessible entity IDs (for Account Admins who can see multiple entities)
export async function getAccessibleEntityIds(
  userId: string
): Promise<string[]>
```

#### Middleware/Route Protection (`lib/auth-middleware.ts`)

```typescript
// Protect API routes with permission check
export function requirePermission(
  resource: string,
  action: string,
  module?: string
)

// Protect routes with module access
export function requireModuleAccess(module: string)

// Protect routes for specific roles
export function requireRole(...roles: Role[])
```

---

### 5. Database Seeding

#### Seed Data Required
1. **Default Permissions** - All resource:action combinations
2. **Module Permissions** - All module access permissions
3. **Role-Permission Mappings** - Assign permissions to predefined roles
   - PLATFORM_ADMIN: All permissions
   - ACCOUNT_ADMIN: All permissions (scoped to Account)
   - ENTITY_ADMIN: All permissions (scoped to Entity)
   - ENTITY_USER: Read + Create permissions (as defined above)
4. **Initial Platform Admin** - First user with PLATFORM_ADMIN role
5. **Sample TenantAccount & Entity** - For testing
6. **TenantAccount Creation** - Only Platform Admins can create (enforced in seed/API)

---

### 6. Authentication Updates

#### NextAuth Configuration Updates
- Include `entityId`, `accountId`, and `role` in session
- Add entity context to JWT token
- Update session callback to include permissions
- **Permission caching**: Permissions cached in JWT until role change
- Session refresh required after role/permission updates

#### Session Structure
```typescript
{
  user: {
    id: string
    email: string
    name: string
    role: Role
    entityId: string
    accountId: string
    permissions: string[] // Cached permissions
  }
}
```

---

### 7. UI Components

#### Permission-Based UI (`components/permissions/`)
- `<RequirePermission>` - Show/hide UI based on permission
- `<RequireModule>` - Show/hide module access
- `<RequireRole>` - Show/hide based on role
- `usePermission()` - React hook for permission checks
- `useModuleAccess()` - React hook for module access

---

### 8. Migration Strategy

#### Data Migration
1. Create new Account and Entity models
2. Create default Entity for existing data
3. Add `entityId` to all business models
4. Migrate existing users to default Entity
5. Assign default roles to existing users
6. Seed permissions and role-permission mappings

---

## Future Scope (Post-MVP)

### Phase 2: Custom Roles

#### New Models
```prisma
model CustomRole {
  id          String   @id @default(cuid())
  entityId    String?  // If null, it's Account-level
  accountId   String?  // If null, it's platform-level
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  entity      Entity?  @relation(fields: [entityId], references: [id])
  account     Account? @relation(fields: [accountId], references: [id])
  permissions CustomRolePermission[]
  userRoles   UserCustomRole[]
}

model CustomRolePermission {
  id           String     @id @default(cuid())
  customRoleId String
  permissionId String
  createdAt    DateTime   @default(now())
  
  customRole   CustomRole @relation(fields: [customRoleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([customRoleId, permissionId])
}

model UserCustomRole {
  id           String     @id @default(cuid())
  userId       String
  customRoleId String
  assignedAt   DateTime   @default(now())
  assignedBy   String
  
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  customRole   CustomRole @relation(fields: [customRoleId], references: [id], onDelete: Cascade)
  
  @@unique([userId, customRoleId])
}
```

#### Features
- Create custom roles at Account or Entity level
- Assign custom permissions to custom roles
- Users can have multiple custom roles (in addition to base role)
- Role templates for quick setup
- Role inheritance (custom roles can extend predefined roles)

---

### Phase 3: Advanced Permissions

#### Granular Actions
- Extend actions beyond CRUD:
  - `approve`, `reject`, `send`, `archive`, `restore`
  - Resource-specific actions (e.g., `invoices:mark_paid`, `timesheets:approve`)

#### Conditional Permissions
- Field-level permissions (e.g., can edit invoice amount but not status)
- Time-based permissions (e.g., can only approve during business hours)
- Amount-based permissions (e.g., can approve invoices up to $10,000)

#### Permission Overrides
- Temporary permission grants
- Permission exceptions for specific users
- Audit trail for permission changes

---

### Phase 4: Multi-Entity Access

#### Features
- Users can belong to multiple Entities (within same Account)
- Different roles in different Entities
- Cross-entity data access (with proper permissions)
- Entity switching in UI

---

### Phase 5: Advanced Features

#### Audit & Compliance
- Permission change audit log
- User access logs
- Data access tracking
- Compliance reporting

#### Role Templates
- Pre-built role templates for common use cases
- Industry-specific templates
- Customizable templates

#### Permission Groups
- Group related permissions for easier management
- Permission inheritance from groups

---

## Implementation Checklist

### MVP (Phase 1)
- [ ] Update Prisma schema with Account, Entity, Permission, RolePermission models
- [ ] Add `entityId` to all business models
- [ ] Create migration scripts
- [ ] Seed default permissions
- [ ] Seed role-permission mappings
- [ ] Create permission utility functions
- [ ] Create data scoping utilities
- [ ] Update NextAuth configuration
- [ ] Create permission-based UI components
- [ ] Update middleware for route protection
- [ ] Update all API routes/server actions with permission checks
- [ ] Update all queries to scope by entity
- [ ] Create Account/Entity management UI (for admins)
- [ ] Update user management to include entity assignment
- [ ] Add entity context to all pages
- [ ] Testing: Permission checks, data isolation, role hierarchy

### Future Phases
- [ ] Custom roles implementation
- [ ] Advanced permissions
- [ ] Multi-entity access
- [ ] Audit & compliance features
- [ ] Role templates
- [ ] Permission groups

---

## Technical Considerations

### Performance
- Cache user permissions in session/JWT (refresh on role change)
- Use database indexes on `entityId` fields
- Optimize permission checks (avoid N+1 queries)

### Security
- Always verify entity access in server-side code (never trust client)
- Use Prisma middleware for automatic entity scoping
- Audit all permission checks
- Rate limiting on permission-sensitive operations

### Modularity
- Permission system should be in separate module/package
- Generic enough to be extracted for other projects
- Clear separation between core RBAC and business logic

### Testing
- Unit tests for permission utilities
- Integration tests for data scoping
- E2E tests for role-based access
- Test data isolation between entities

---

## File Structure

```
lib/
  permissions/
    index.ts              # Main permission utilities
    types.ts              # TypeScript types
    constants.ts           # Permission constants
    seed.ts               # Permission seeding
  data-scoping/
    index.ts              # Data scoping utilities
    middleware.ts         # Prisma middleware for auto-scoping
  auth/
    middleware.ts         # Auth middleware helpers
    session.ts            # Session utilities

components/
  permissions/
    RequirePermission.tsx
    RequireModule.tsx
    RequireRole.tsx
    hooks/
      usePermission.ts
      useModuleAccess.ts

prisma/
  migrations/
  seeds/
    permissions.ts        # Permission seed data
    roles.ts              # Role-permission mappings
```

---

## Terminology & Architecture Decisions

### ✅ Resolved

1. **Account Model Naming**: 
   - ✅ Using `TenantAccount` for multi-tenant accounts
   - ✅ NextAuth `Account` renamed to `AuthAccount` to avoid conflicts

2. **Entity Naming**: 
   - ✅ Using "Entity" internally (code/database)
   - ✅ Displayed as "Company" in UI (configurable per tenant)

3. **Terminology Strategy**:
   - ✅ Internal: `TenantAccount` → `Entity`
   - ✅ External: `Organisation` → `Company`
   - ✅ Translation layer in UI components
   - ✅ Can be customized per TenantAccount

### ✅ All Decisions Made

1. **Default ENTITY_USER Permissions**: 
   - ✅ **Option B: Read + Create for most resources**
   - Default permissions:
     - `clients:read`, `clients:create`, `clients:update`
     - `invoices:read`, `invoices:create`
     - `timesheets:read`, `timesheets:create`
     - `jobs:read`, `jobs:create`, `jobs:update`
     - `subcontractors:read`, `subcontractors:create`
     - `employees:read`, `employees:create`
     - `assets:read`
     - `bank_transactions:read`
     - `module:dashboard`, `module:clients`, `module:invoices`, `module:timesheets`, `module:jobs`
   - **No delete permissions** (reserved for admins)
   - **No approve permissions** (reserved for admins)

2. **Permission Caching**: 
   - ✅ **Option A: Until role change**
   - Permissions cached in JWT/session
   - Automatically invalidated when user's role changes
   - Session refresh required after role change

3. **TenantAccount Creation**: 
   - ✅ **Option A: Only Platform Admins**
   - Platform Admins can create new TenantAccounts
   - Self-service registration can be added in future phase

---

## Next Steps

1. ✅ **All decisions finalized** - All questions answered
2. ✅ **Naming confirmed** - TenantAccount/Entity internally, Organisation/Company in UI
3. ✅ **Default permissions defined** - ENTITY_USER has Read + Create permissions
4. **Ready for implementation** - Begin with schema updates and migrations

---

## Implementation Ready

All planning decisions have been made. The system is ready for implementation with:
- ✅ Clear architecture (Platform Core + Business Modules)
- ✅ Terminology strategy (Internal vs External)
- ✅ Role hierarchy defined
- ✅ Permission structure defined
- ✅ Default permissions for all roles
- ✅ Caching strategy defined
- ✅ Access control rules defined

**Proceed with implementation when ready.**
