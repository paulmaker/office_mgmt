# Configurable Module Access - Implementation Plan

## Overview
Enable organizations to control which modules/features are available to their users. This allows different companies to enable/disable features based on their needs (e.g., some may not need CIS Payroll, others may not need Asset Management).

## Architecture Decision

**Storage Location:** `Entity.settings` (JSON field)
- **Why Entity-level?** Different companies (entities) within the same organization might have different needs
- **Alternative:** Could be `TenantAccount.settings` for organization-wide control
- **Recommendation:** Start with Entity-level, can add TenantAccount-level inheritance later

## Module Definitions

### Core Modules (Always Enabled)
- ✅ **Dashboard** - Always visible
- ✅ **Settings** - Always visible (for admins)
- ✅ **Admin** - Always visible (for admins)

### Configurable Modules
1. **Clients** (`clients`)
2. **Subcontractors** (`subcontractors`)
3. **Employees** (`employees`)
4. **Suppliers** (`suppliers`)
5. **Jobs** (`jobs`)
6. **Job Prices** (`jobPrices`)
7. **Invoices** (`invoices`)
8. **Timesheets** (`timesheets`)
9. **CIS Payroll** (`payroll`)
10. **Bank Reconciliation** (`banking`)
11. **Reports** (`reports`)
12. **Assets** (`assets`)
13. **Quick Links** (`quickLinks`)

## Implementation Steps

### Phase 1: Backend Infrastructure

#### 1.1 Create Module Access Utility (`lib/module-access.ts`)
```typescript
// Define module keys and metadata
export const MODULES = {
  clients: { name: 'Clients', default: true },
  subcontractors: { name: 'Subcontractors', default: true },
  employees: { name: 'Employees', default: true },
  suppliers: { name: 'Suppliers', default: true },
  jobs: { name: 'Jobs', default: true },
  jobPrices: { name: 'Job Prices', default: true },
  invoices: { name: 'Invoices', default: true },
  timesheets: { name: 'Timesheets', default: true },
  payroll: { name: 'CIS Payroll', default: true },
  banking: { name: 'Bank Reconciliation', default: true },
  reports: { name: 'Reports', default: true },
  assets: { name: 'Assets', default: true },
  quickLinks: { name: 'Quick Links', default: true },
} as const

export type ModuleKey = keyof typeof MODULES

// Get enabled modules for an entity
export async function getEnabledModules(entityId: string): Promise<Set<ModuleKey>>
// Check if a specific module is enabled
export async function isModuleEnabled(entityId: string, module: ModuleKey): Promise<boolean>
```

#### 1.2 Update Settings Actions (`app/actions/settings.ts`)
- Add `enabledModules: ModuleKey[]` to settings schema
- Include in `getSettings()` and `updateSettings()`
- Default: All modules enabled (for backward compatibility)

#### 1.3 Add Module Access to Session
- Update NextAuth to include `enabledModules` in JWT/session
- Load from Entity.settings during login
- Cache in session to avoid DB queries on every request

### Phase 2: UI Filtering

#### 2.1 Update Sidebar (`components/sidebar.tsx`)
- Filter navigation items based on `session.user.enabledModules`
- Hide disabled modules from menu
- Keep core modules (Dashboard, Settings, Admin) always visible

#### 2.2 Add Module Settings UI (`app/(dashboard)/settings/page.tsx`)
- Add new "Module Access" card
- Toggle switches for each module
- Save to Entity.settings
- Show which modules are currently enabled/disabled

### Phase 3: Route Protection

#### 3.1 Create Middleware (`middleware.ts`)
- Check module access before allowing route access
- Redirect to `/dashboard` if user tries to access disabled module
- Show friendly error message

#### 3.2 Update Layout Protection (`app/(dashboard)/layout.tsx`)
- Optional: Add client-side check for module access
- Can redirect or show "Module Disabled" message

### Phase 4: Server-Side Enforcement

#### 4.1 Update Server Actions
- Add module checks to relevant server actions
- Example: `getTimesheets()` should check `timesheets` module
- Example: `getInvoices()` should check `invoices` module
- Return error if module is disabled

#### 4.2 Add Helper Function
```typescript
// lib/module-access.ts
export async function requireModule(entityId: string, module: ModuleKey) {
  const enabled = await isModuleEnabled(entityId, module)
  if (!enabled) {
    throw new Error(`Module "${MODULES[module].name}" is not enabled for this organization`)
  }
}
```

## Data Structure

### Entity.settings JSON Schema
```typescript
{
  // ... existing settings (companyName, vatNumber, etc.)
  enabledModules: [
    "clients",
    "subcontractors",
    "invoices",
    "timesheets",
    "payroll",
    // ... etc
  ]
}
```

**Default Behavior:**
- If `enabledModules` is missing/null → All modules enabled (backward compatible)
- If `enabledModules` is empty array `[]` → Only core modules (Dashboard, Settings)

## UI/UX Considerations

### Settings Page
- **Location:** Add "Module Access" section to existing Settings page
- **Layout:** Card with toggle switches, grouped by category:
  - **People & Contacts:** Clients, Subcontractors, Employees, Suppliers
  - **Operations:** Jobs, Job Prices, Invoices, Timesheets
  - **Financial:** CIS Payroll, Bank Reconciliation, Reports
  - **Tools:** Assets, Quick Links
- **Permissions:** Only `ENTITY_ADMIN`, `ACCOUNT_ADMIN`, or `PLATFORM_ADMIN` can change

### User Experience
- **Graceful Degradation:** If user bookmarks a disabled module URL, show friendly message
- **No Breaking Changes:** Existing users see all modules until explicitly disabled
- **Visual Feedback:** Disabled modules hidden from sidebar (cleaner UX)

## Migration Strategy

1. **Backward Compatibility:** All existing entities get all modules enabled by default
2. **Gradual Rollout:** Admins can disable modules one by one
3. **No Data Loss:** Disabling a module doesn't delete data, just hides access

## Security Considerations

- **Server-Side Validation:** Always check module access in server actions (don't trust client)
- **Role-Based:** Only admins can change module settings
- **Audit Trail:** Consider logging module access changes (future enhancement)

## Future Enhancements

1. **TenantAccount-Level Inheritance:** Allow organization-wide defaults
2. **Module Dependencies:** Some modules might require others (e.g., Payroll requires Timesheets)
3. **Module Permissions:** Fine-grained control (e.g., "View Reports" vs "Full Reports Access")
4. **Usage Analytics:** Track which modules are used most (future feature)

## Implementation Order

1. ✅ **Phase 1.1 & 1.2:** Create utility and update settings (Backend)
2. ✅ **Phase 2.2:** Add Module Access UI to Settings page
3. ✅ **Phase 1.3:** Add to session (so sidebar can access)
4. ✅ **Phase 2.1:** Update Sidebar to filter
5. ✅ **Phase 3:** Add route protection
6. ✅ **Phase 4:** Add server-side checks to actions

## Testing Checklist

- [ ] Disable a module → Verify it disappears from sidebar
- [ ] Disable a module → Try accessing URL directly → Should redirect
- [ ] Disable a module → Try calling server action → Should error
- [ ] Re-enable module → Verify it reappears
- [ ] Test with different user roles (admin vs regular user)
- [ ] Verify backward compatibility (existing entities see all modules)
