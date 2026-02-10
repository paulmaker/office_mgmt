# Multi-Tenant RBAC Implementation Status

## ✅ Completed


### 1. Database Schema Updates
- ✅ Added `TenantAccount` model (top-level organization)
- ✅ Added `Entity` model (sub-organization within Account)
- ✅ Added `Permission` model (resource-based and module-based)
- ✅ Added `RolePermission` model (many-to-many: Role → Permissions)
- ✅ Updated `User` model with `entityId` and new `Role` enum
- ✅ Renamed NextAuth `Account` to `AuthAccount` to avoid conflicts
- ✅ Added `entityId` to all business models:
  - Client, Invoice, Timesheet, Subcontractor
  - BankTransaction, CompanyAsset, Job, Employee
  - VATReturn, CISReturn, QuickLink
- ✅ Added proper indexes on `entityId` fields for performance
- ✅ Added unique constraints where needed (e.g., `[entityId, invoiceNumber]`)

### 2. Platform Core - Multi-Tenancy
- ✅ Created `lib/platform-core/multi-tenancy/index.ts`
  - `getUserEntity()` - Get user's entity context
  - `canAccessEntity()` - Check entity access
  - `getAccessibleEntityIds()` - Get all accessible entity IDs
  - `scopeToEntity()` - Add entity filter to queries
  - `scopeToEntities()` - Add multiple entity filter

### 3. Platform Core - RBAC
- ✅ Created `lib/platform-core/rbac/types.ts` - TypeScript types
- ✅ Created `lib/platform-core/rbac/constants.ts` - Permission constants
  - Resources, Actions, Modules
  - ENTITY_USER default permissions (Read + Create)
- ✅ Created `lib/platform-core/rbac/checks.ts` - Permission checking
  - `hasPermission()` - Check specific permission
  - `hasModuleAccess()` - Check module access
  - `getUserPermissions()` - Get all user permissions
  - `isPlatformAdmin()`, `isAccountAdmin()`, `isEntityAdmin()`
- ✅ Created `lib/platform-core/rbac/seed.ts` - Permission seeding
  - `seedPermissions()` - Seed all permissions
  - `seedRolePermissions()` - Assign permissions to roles
  - `seedRBAC()` - Run all seed functions

### 4. Platform Core - Terminology
- ✅ Created `lib/platform-core/terminology/index.ts`
  - Default terminology: Account → Organisation, Entity → Company
  - Translation functions
  - Configurable per TenantAccount (ready for future implementation)

### 5. Authentication Updates
- ✅ Updated NextAuth configuration
  - Include `entityId` and `accountId` in user object
  - Load permissions and cache in JWT
  - Session includes: id, email, name, role, entityId, accountId, permissions
  - Permission refresh on role change (via trigger)

## ⏳ Next Steps

### 1. Database Migration
- [ ] Run Prisma migration: `npx prisma migrate dev --name add_multi_tenant_rbac`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Test schema changes

### 2. Seed Initial Data
- [ ] Create seed script that:
  - Seeds all permissions
  - Seeds role-permission mappings
  - Creates initial Platform Admin user
  - Creates sample TenantAccount and Entity
- [ ] Run seed: `npx prisma db seed` (or custom script)

### 3. Update PrismaAdapter Configuration
- [ ] Verify PrismaAdapter works with `AuthAccount` model
- [ ] If needed, configure model mappings in NextAuth

### 4. Update Existing Code
- [ ] Update any code that references old `UserRole` enum
- [ ] Update any code that references `Account` model (should be `AuthAccount`)
- [ ] Update mock data to include `entityId` fields

### 5. Create Permission-Based UI Components
- [ ] Create `components/permissions/RequirePermission.tsx`
- [ ] Create `components/permissions/RequireModule.tsx`
- [ ] Create `components/permissions/RequireRole.tsx`
- [ ] Create hooks: `usePermission()`, `useModuleAccess()`

### 6. Update Business Logic
- [ ] Update all server actions/queries to:
  - Scope data by `entityId`
  - Check permissions before operations
  - Use `scopeToEntity()` helper

### 7. Testing
- [ ] Test permission checks
- [ ] Test data isolation between entities
- [ ] Test role hierarchy
- [ ] Test permission caching in JWT

## 📝 Notes

### Current Implementation Details

**Permission Caching:**
- Permissions are cached in JWT token
- Cached until role change
- Automatically refreshed when role changes (via NextAuth trigger)

**Default ENTITY_USER Permissions:**
- Read + Create for: clients, invoices, timesheets, jobs, subcontractors, employees
- Read-only for: assets, bank_transactions
- Module access: dashboard, clients, invoices, timesheets, jobs
- No delete or approve permissions (reserved for admins)

**Terminology:**
- Internal: `TenantAccount` → `Entity`
- External (UI): `Organisation` → `Company`
- Translation layer ready for per-tenant customization

### Known Limitations (MVP)

1. **Permission Checks:** Currently uses hardcoded ENTITY_USER_PERMISSIONS. For production, should query database for role permissions. This can be enhanced later.

2. **PrismaAdapter:** May need configuration for `AuthAccount` model. Test after migration.

3. **Password Authentication:** Still needs password field and hashing implementation (marked as TODO in auth route).

## 🚀 Ready for Migration

The schema and platform core are ready. Next step is to:
1. Run database migration
2. Seed permissions
3. Test the system
