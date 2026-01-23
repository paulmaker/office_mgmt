# Client Requirements Analysis & Implementation Plan

**Date:** January 23, 2025  
**Status:** Analysis Complete - Ready for Implementation

---

## 📋 Requirements Summary

### 1. **Clients** ✅ Schema Ready, Needs UI Update
**Requirement:** New field `referenceCode` to generate invoice codes (e.g., `LU_00001`)

**Current State:**
- ❌ Field does not exist in Client model
- ✅ Client form exists and can be updated

**Action Required:**
- Add `referenceCode` field to Client model (String, optional, unique per entity)
- Implement auto-generation logic for reference codes
- Update client form to include reference code field (with auto-generate option)
- Add validation to ensure format consistency

**✅ ANSWERED:** Auto-generate reference codes

---

### 2. **Jobs** ✅ Schema Ready, Needs Implementation
**Requirements:**
- ✅ Multiple employees (2-3) - **ALREADY SUPPORTED** via `JobEmployee` junction table
- ✅ Multiple line items (Bathroom, Living Room, Stairs) - **ALREADY SUPPORTED** via `JobLineItem` model
- ✅ `jobNumber` field exists (can be used for client's reference number)

**Current State:**
- ✅ `JobEmployee` many-to-many relationship exists
- ✅ `JobLineItem` one-to-many relationship exists
- ✅ `jobNumber` field exists (can store client's job number)
- ❌ Jobs CRUD not implemented yet

**Action Required:**
- Implement Jobs CRUD to support:
  - Multi-select for employees (2-3 employees)
  - Dynamic line items (add/remove rows)
  - Auto-calculate total from line items
  - Use `jobNumber` field for client's job number reference

**✅ RESOLVED:** No need for separate `customerJobNumber` - existing `jobNumber` field will be used

---

### 3. **Invoices** ⚠️ Partially Implemented
**Requirements:**
- ✅ Reverse VAT - **ALREADY SUPPORTED** (`reverseCharge` Boolean field exists)
- ❌ Line items with job numbers (select jobs done in the month)
- ❌ Invoice ID generated from Invoice Code table using Client ref + next ID

**Current State:**
- ✅ `reverseCharge` field exists in Invoice model
- ✅ `lineItems` field exists (JSON) but needs structure
- ❌ No link between Invoice line items and Jobs
- ❌ No InvoiceCode model for generating invoice numbers

**Action Required:**
- Create `InvoiceCode` model (see schema below)
- Update Invoice line items structure to include:
  - Job reference (jobId)
  - Job number display
  - Description
  - Amount
- Implement invoice number generation logic
- Add job selection UI when creating invoices
- Update invoice form to show reverse VAT option

**Questions:**
- When reverse VAT is enabled, should VAT amount be 0 or negative?
- Should invoice line items be editable after invoice is created?
- Should we allow selecting jobs from multiple clients on one invoice?

---

### 4. **Invoice Codes** ❌ New Table Required
**Requirement:** New table for generating unique invoice codes using Client reference + numeric ID

**Proposed Schema:**
```prisma
model InvoiceCode {
  id            String   @id @default(cuid())
  entityId      String
  clientId      String
  lastNumber    Int      @default(0)  // Last used number
  prefix        String   // Client's reference code (e.g., "LU")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  entity        Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  client        Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([entityId, clientId])
  @@index([entityId])
}
```

**Action Required:**
- Create InvoiceCode model
- Create migration
- Implement invoice number generation function:
  ```typescript
  async function generateInvoiceNumber(clientId: string): Promise<string> {
    // Get or create InvoiceCode for client
    // Increment lastNumber
    // Return format: "LU_00001"
  }
  ```

**Questions:**
- Should invoice numbers reset annually or be continuous?
- What should happen if a client's reference code changes?

---

### 5. **Employees** ⚠️ Schema Exists, No UI
**Requirement:** 
- ✅ Employees table exists in schema
- ❌ Not in UI/mockup
- ❌ Extra field for car

**Current State:**
- ✅ Employee model exists with: `id`, `name`, `email`, `phone`, `employeeId`, `notes`
- ❌ No CRUD operations
- ❌ No UI page
- ❌ No `car` field

**Action Required:**
- Add `car` field to Employee model (String, optional - e.g., "Ford Transit", "VW Golf")
- Create Employees CRUD:
  - Server actions: `app/actions/employees.ts`
  - Form component: `components/employees/employee-form.tsx`
  - Page: `app/(dashboard)/employees/page.tsx`
- Add employees to sidebar navigation

**Questions:**
- Should car field be a simple text field or a structured field (make, model, registration)?
- Do we need to track car-related expenses or maintenance?

---

### 6. **Suppliers** ❌ New Table Required
**Requirement:** New table/page to store supplier information

**Proposed Schema:**
```prisma
model Supplier {
  id              String   @id @default(cuid())
  entityId        String
  name            String
  companyName     String?
  email           String?
  phone           String?
  address         String?
  vatNumber       String?
  vatRegistered   Boolean  @default(false)
  paymentTerms    Int      @default(30)
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  entity          Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  purchaseInvoices Invoice[] @relation("SupplierPurchaseInvoices")

  @@index([entityId])
}
```

**Action Required:**
- Create Supplier model
- Create migration
- Create Suppliers CRUD (similar to Clients)
- Add Suppliers to sidebar
- Link to Purchase Invoices

**Future Enhancement:**
- AI PDF scanning for purchase orders (mentioned but not priority)

**Questions:**
- Should suppliers have reference codes like clients?
- Do we need to track supplier-specific payment terms?

---

### 7. **Assets** ✅ Fields Identified
**Requirement:** New fields required on top of current schema

**Current Schema Fields:**
- `id`, `type`, `name`, `registrationNumber`, `motDueDate`, `taxDueDate`, `insuranceDueDate`, `serviceDueDate`, `remindersEnabled`, `notes`

**New Fields Required:**
- `leaseExpiryDate` (DateTime, optional) - For tracking lease expiration
- `merseyFlow` (Boolean, default true) - MerseyFlow toll system tracking
- `companyCar` (Boolean, default true) - Indicates if asset is a company car

**Action Required:**
- Add three new fields to CompanyAsset model
- Update assets form and page to display new fields
- Update assets CRUD operations

**✅ ANSWERED:** Three new fields identified from schema image

---

### 8. **Job Prices** ❌ New Table Required
**Requirement:** New table/page to store set job prices for each Client. Select jobs and populate prices on Invoice/Job Sheets.

**Proposed Schema:**
```prisma
model JobPrice {
  id            String   @id @default(cuid())
  entityId      String
  clientId      String
  jobType       String   // e.g., "Bathroom", "Living Room", "Stairs", "Full House"
  description   String   // Detailed description
  price         Float
  isActive      Boolean  @default(true)
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  entity        Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  client        Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([entityId, clientId, jobType])
  @@index([entityId])
  @@index([clientId])
}
```

**Action Required:**
- Create JobPrice model
- Create migration
- Create Job Prices CRUD page
- Integrate with:
  - Job creation (pre-populate line items from JobPrice)
  - Invoice creation (select jobs and auto-populate prices)

**Questions:**
- Should job prices be per-client only, or can there be default prices?
- Can one client have multiple prices for the same job type (e.g., different rates for different properties)?

---

### 9. **Timesheets** ⚠️ Schema Exists, Needs Enhancement
**Requirement:** Sample email format provided - need to parse and create timesheet/payroll entry

**Sample Email Format:**
```
Mon 15 clare Street mow cap/ stainblock living room ceiling, bedroom ceiling, kitchen walls an ceiling oil undercoat all woodwork, paint back gate extra 
Tue 33 Derby Court stripped living room wall, 3 coats paint on bed 1 bed 2 an bathroom 
Wed 33 derby court 
Thu 15 clare Street 
Fri 32 poolside Alsager stainblock large kitchen ceiling, 5m2 stainblock on walls various places ,3 coats on all walls,this is 1 bed flat with a staircase in it 
£55 petrol ⛽️ Stoke/ Alsager
```

**Current Schema:**
- Has: `id`, `subcontractorId`, `periodStart`, `periodEnd`, `hoursWorked`, `rate`, `grossAmount`, `cisDeduction`, `netAmount`, `status`, `submittedVia`, `approvedBy`, `approvedAt`, `processedAt`, `paidAt`, `notes`

**Action Required:**
- Add `submittedDate` field (DateTime, optional)
- Add `expenses` field (Float, default 0) - for expenses incurred
- Add `receiptsReceived` field (Boolean, default false) - for tracking receipt status
- Create email parsing utility (future enhancement)
- Update timesheet form to include:
  - Submitted date
  - Expenses field
  - Receipts received checkbox
  - Job references (link to jobs worked on)

**Questions:**
- Should timesheets link to specific Jobs? (Add `jobId` or `jobIds`?)
- How should expenses be structured? (Single amount or multiple expense items?)
- Should we create a separate `TimesheetExpense` model for multiple expenses?

---

### 10. **Payroll** ⚠️ Needs Major Enhancement
**Requirements:**
- Link to timesheets ✅ (already linked via subcontractor)
- Additional hours at agreed special rates
- Submitted Date column ✅ (add to timesheet)
- Expenses incurred ✅ (add to timesheet)
- Receipts received ✅ (add to timesheet)
- Multiple detail rows making up Total

**Current State:**
- Payroll page shows timesheets but doesn't have detail breakdown
- No support for additional hours at special rates
- No expense tracking

**Proposed Enhancement:**
Create `PayrollEntry` model for detailed breakdown:
```prisma
model PayrollEntry {
  id            String   @id @default(cuid())
  entityId      String
  timesheetId   String?  // Optional link to timesheet
  subcontractorId String
  entryType     PayrollEntryType  // REGULAR_HOURS, ADDITIONAL_HOURS, EXPENSE, OTHER
  description   String
  hours         Float?   // For hour-based entries
  rate          Float?   // Rate per hour
  amount        Float    // Total amount
  date          DateTime
  submittedDate DateTime?
  receiptsReceived Boolean @default(false)
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  entity        Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  timesheet     Timesheet? @relation(fields: [timesheetId], references: [id])
  subcontractor Subcontractor @relation(fields: [subcontractorId], references: [id])

  @@index([entityId])
  @@index([timesheetId])
  @@index([subcontractorId])
}

enum PayrollEntryType {
  REGULAR_HOURS
  ADDITIONAL_HOURS
  EXPENSE
  OTHER
}
```

**Alternative Approach (Simpler):**
- Add fields directly to Timesheet:
  - `additionalHours` (Float)
  - `additionalHoursRate` (Float)
  - `expenses` (Float)
  - `receiptsReceived` (Boolean)
  - `submittedDate` (DateTime)
- Create detail view showing breakdown

**Action Required:**
- Decide on approach (separate model vs. enhanced timesheet)
- Implement chosen approach
- Update payroll page to show detailed breakdown
- Add ability to add multiple detail rows

**Questions:**
- Should additional hours be tracked separately or combined with regular hours?
- Do we need to track multiple expense items per timesheet, or is a single total sufficient?
- Should payroll entries be editable after submission?

---

### 11. **Reconciliation** ❌ New Feature Required
**Requirements:**
- Bank export reconciliation (copy/paste from bank statements)
- Cross-reference invoices paid (payments received)
- Check wages payments
- Cross-reference purchase invoices (business expenses)
- Link PDF remittances to payments received

**Current State:**
- `BankTransaction` model exists with basic fields
- No reconciliation UI
- No document attachment support

**Action Required:**
- Enhance `BankTransaction` model:
  - Add `reconciliationDate` (DateTime, optional)
  - Add `reconciledBy` (String, optional - userId)
  - Add `linkedInvoiceId` (already exists)
  - Add `linkedTimesheetId` (String, optional)
  - Add `documentUrl` (String, optional) - for PDF remittances
- Create Reconciliation page:
  - Import bank transactions (paste CSV/text)
  - Match transactions to invoices
  - Match transactions to timesheets/payroll
  - Mark as reconciled
  - Upload and link PDF remittances
- Add file upload capability for PDFs (store in cloud storage or database)

**✅ ANSWERED:** Start with CSV format for bank exports

---

### 12. **Job Lockdown** ✅ No Extra Security Needed
**Requirement:** "Main area to lock down is these jobs to enter on timesheets, invoices etc"

**Action Required:**
- Ensure Jobs have proper permission checks (standard RBAC)
- Verify that only authorized users can:
  - Create jobs
  - Link jobs to invoices
  - Link jobs to timesheets
- Add entity scoping to all job operations (standard multi-tenancy)

**✅ ANSWERED:** No extra security restrictions needed for now - standard RBAC will apply

---

## 🎯 Implementation Priority

### Phase 1: Critical for First Client (High Priority)
1. ✅ **Clients** - Add `referenceCode` field (auto-generate)
2. ✅ **Jobs** - Implement full CRUD with multi-employee and line items
3. ✅ **Invoice Codes** - Create model and invoice number generation
4. ✅ **Invoices** - Update to use invoice codes, link to jobs, support reverse VAT
5. ✅ **Employees** - Add `car` field, create CRUD
6. ✅ **Assets** - Add `leaseExpiryDate`, `merseyFlow`, `companyCar` fields

### Phase 2: Important Features
6. ✅ **Suppliers** - Create model and CRUD
7. ✅ **Job Prices** - Create model and CRUD, integrate with Jobs/Invoices
8. ✅ **Timesheets** - Add submitted date, expenses, receipts fields
9. ✅ **Payroll** - Enhance with additional hours, expenses, detail breakdown

### Phase 3: Advanced Features
10. ✅ **Assets** - Add missing fields (need clarification)
11. ✅ **Reconciliation** - Bank import, matching, PDF linking
12. ✅ **Email Parsing** - Parse contractor emails into timesheets (future)

---

## 📝 Schema Changes Summary

### New Models Required:
1. `InvoiceCode` - For generating invoice numbers
2. `Supplier` - For supplier management
3. `JobPrice` - For storing client-specific job prices
4. `PayrollEntry` (optional) - For detailed payroll breakdown

### Model Updates Required:
1. **Client** - Add `referenceCode` (String, optional, unique per entity) - **Auto-generate**
2. **Employee** - Add `car` (String, optional)
3. **Timesheet** - Add `submittedDate`, `expenses`, `receiptsReceived`
4. **CompanyAsset** - Add `leaseExpiryDate`, `merseyFlow`, `companyCar`
5. **BankTransaction** - Add `reconciliationDate`, `reconciledBy`, `linkedTimesheetId`, `documentUrl`

### Invoice Model Updates:
- Update `lineItems` JSON structure to include `jobId` references
- Ensure `reverseCharge` is properly handled in UI

---

## ❓ Questions for Client

1. **Clients - Reference Code:**
   - Auto-generated or manual entry?
   - Format validation rules?
   - Required or optional?

2. **Jobs - Customer Job Number:**
   - Unique constraint or can be duplicated?
   - Required field?

3. **Invoices - Reverse VAT:**
   - When enabled, should VAT amount be 0 or shown as negative?
   - Any special handling needed?

4. **Invoices - Job Selection:**
   - Can one invoice include jobs from multiple clients?
   - Should line items be editable after invoice creation?

5. **Employees - Car Field:**
   - Simple text or structured (make/model/registration)?
   - Need to track car expenses/maintenance?

6. **Assets - Additional Fields:**
   - What specific fields are needed beyond current schema?

7. **Job Prices:**
   - Per-client only or default prices too?
   - Multiple prices per client for same job type?

8. **Timesheets - Expenses:**
   - Single total or multiple expense items?
   - Should timesheets link to specific Jobs?

9. **Payroll - Additional Hours:**
   - Tracked separately or combined with regular hours?
   - Multiple expense items or single total?

10. **Reconciliation:**
    - Bank export format? (CSV, Excel, text?)
    - PDF storage location? (S3, database, local?)

11. **Job Security:**
    - What specific restrictions needed for job creation/editing?

---

## 🚀 Next Steps

1. **Review this document with client** to answer questions
2. **Create detailed implementation plan** for Phase 1 items
3. **Start with schema migrations** for Phase 1
4. **Implement CRUD operations** following existing patterns
5. **Update UI components** to support new fields
6. **Test with sample data** matching client's use case

---

## 📌 Notes

- All new models should follow existing patterns:
  - Entity scoping (`entityId`)
  - Permission checks in server actions
  - RBAC integration
  - Multi-tenancy support

- Invoice number generation should be atomic to prevent duplicates

- Job Prices integration should:
  - Auto-populate when creating jobs
  - Auto-populate when creating invoices
  - Allow manual override

- Timesheet email parsing can be implemented later as enhancement

- PDF storage for remittances should use cloud storage (S3/Vercel Blob) in production
