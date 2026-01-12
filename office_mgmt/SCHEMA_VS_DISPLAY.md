# Schema Fields vs. Displayed Fields Analysis

This document compares the database schema fields with what's actually displayed on each page.

## Summary

**The schema contains many more fields than are displayed.** This is partially intentional (some fields are for internal use, detailed views, or forms), but several important fields are missing from the list views that should be visible.

---

## Client Model

### Schema Fields:
- `id`, `name`, `companyName`, `email`, `phone`, `address`, `billingAddress`, `vatNumber`, `vatRegistered`, `cisRegistered`, `paymentTerms`, `ratesConfig`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- ✅ `name`
- ✅ `companyName`
- ✅ `email`
- ✅ `phone`
- ✅ `address`
- ✅ `vatRegistered` (as badge)
- ✅ `cisRegistered` (as badge)
- ✅ `paymentTerms`
- ✅ `createdAt`

### Missing from Display:
- ❌ `billingAddress` - **Should be shown** (different from address)
- ❌ `vatNumber` - **Should be shown** (currently only badge, not the number)
- ❌ `ratesConfig` - **Should be shown** (hourly rates, job pricing)
- ❌ `notes` - **Should be shown** (important client notes)

### Recommendation:
- Add a "View Details" modal/page that shows all fields
- Add `vatNumber` column to table (currently only shows badge)
- Add `billingAddress` if different from address
- Show `notes` in detail view or as tooltip
- Show `ratesConfig` in detail view

---

## Invoice Model

### Schema Fields:
- `id`, `invoiceNumber`, `type`, `clientId`, `subcontractorId`, `date`, `dueDate`, `subtotal`, `vatAmount`, `vatRate`, `cisDeduction`, `cisRate`, `reverseCharge`, `total`, `status`, `paymentDate`, `paymentMethod`, `lineItems`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- ✅ `invoiceNumber`
- ✅ `type`
- ✅ Client/Supplier name (derived from `clientId`/`subcontractorId`)
- ✅ `date`
- ✅ `dueDate`
- ✅ `total`
- ✅ `status`

### Missing from Display:
- ❌ `subtotal` - **Should be shown** (before VAT)
- ❌ `vatAmount` - **Should be shown** (VAT amount)
- ❌ `vatRate` - **Should be shown** (VAT percentage)
- ❌ `cisDeduction` - **Should be shown** (for purchase invoices)
- ❌ `cisRate` - **Should be shown** (CIS percentage)
- ❌ `reverseCharge` - **Should be shown** (important for VAT)
- ❌ `paymentDate` - **Should be shown** (when paid)
- ❌ `paymentMethod` - **Should be shown** (how it was paid)
- ❌ `lineItems` - **Should be shown** (in detail view)
- ❌ `notes` - **Should be shown** (invoice notes)

### Recommendation:
- Add columns for `subtotal`, `vatAmount`, `total` (breakdown)
- Show `paymentDate` and `paymentMethod` when status is PAID
- Add "View Details" modal showing all fields including `lineItems`
- Show `reverseCharge` badge if true
- Show `cisDeduction` for purchase invoices

---

## Timesheet Model

### Schema Fields:
- `id`, `subcontractorId`, `periodStart`, `periodEnd`, `hoursWorked`, `rate`, `grossAmount`, `cisDeduction`, `netAmount`, `status`, `submittedVia`, `approvedBy`, `approvedAt`, `processedAt`, `paidAt`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- ✅ Subcontractor name (derived from `subcontractorId`)
- ✅ `periodStart`
- ✅ `periodEnd`
- ✅ `hoursWorked`
- ✅ `rate`
- ✅ `grossAmount`
- ✅ `cisDeduction`
- ✅ `netAmount`
- ✅ `status`

### Missing from Display:
- ❌ `submittedVia` - **Should be shown** (EMAIL, MANUAL, etc.)
- ❌ `approvedBy` - **Should be shown** (who approved it)
- ❌ `approvedAt` - **Should be shown** (when approved)
- ❌ `processedAt` - **Should be shown** (when processed)
- ❌ `paidAt` - **Should be shown** (when paid)
- ❌ `notes` - **Should be shown** (timesheet notes)

### Recommendation:
- Add columns for `submittedVia`, `approvedBy`, `approvedAt`
- Show `processedAt` and `paidAt` when status is PROCESSED/PAID
- Add `notes` column or show in detail view

---

## Subcontractor Model

### Schema Fields:
- `id`, `name`, `email`, `phone`, `address`, `niNumber`, `utr`, `cisVerificationNumber`, `cisStatus`, `paymentType`, `bankDetails`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- ✅ `name` (shown in payroll page)
- ✅ `cisStatus` (shown in payroll page)
- ✅ `cisVerificationNumber` (shown in payroll page)

### Missing from Display:
- ❌ `email` - **Should be shown**
- ❌ `phone` - **Should be shown**
- ❌ `address` - **Should be shown**
- ❌ `niNumber` - **Should be shown** (National Insurance)
- ❌ `utr` - **Should be shown** (Unique Tax Reference)
- ❌ `paymentType` - **Should be shown** (CIS vs NON_CIS)
- ❌ `bankDetails` - **Should be shown** (in secure detail view)
- ❌ `notes` - **Should be shown**

### Recommendation:
- **Create a Subcontractors page** (currently only shown in payroll)
- Show all contact details
- Show CIS-related fields prominently
- Show `bankDetails` only in secure detail view (sensitive)

---

## BankTransaction Model

### Schema Fields:
- `id`, `date`, `description`, `amount`, `type`, `category`, `reconciled`, `invoiceId`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- ✅ `date`
- ✅ `description`
- ✅ `category`
- ✅ Invoice number (derived from `invoiceId`)
- ✅ `amount`
- ✅ `type` (CREDIT/DEBIT)
- ✅ `reconciled` (as status badge)

### Missing from Display:
- ❌ `notes` - **Should be shown** (transaction notes)

### Recommendation:
- Add `notes` column or show in detail view

---

## CompanyAsset Model

### Schema Fields:
- `id`, `type`, `name`, `registrationNumber`, `motDueDate`, `taxDueDate`, `insuranceDueDate`, `serviceDueDate`, `remindersEnabled`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- ✅ `name`
- ✅ `registrationNumber` (for vehicles)
- ✅ `motDueDate`
- ✅ `taxDueDate`
- ✅ `insuranceDueDate`
- ✅ `serviceDueDate`
- ✅ `remindersEnabled`

### Missing from Display:
- ❌ `notes` - **Should be shown** (asset notes)

### Recommendation:
- Add `notes` column

---

## Job Model

### Schema Fields:
- `id`, `jobNumber`, `clientId`, `employeeId`, `jobDescription`, `dateWorkCommenced`, `price`, `status`, `invoicePaid`, `invoiceId`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- Need to check jobs page

### Recommendation:
- Ensure all fields are displayed appropriately

---

## QuickLink Model

### Schema Fields:
- `id`, `name`, `url`, `category`, `displayOrder`, `createdAt`, `updatedAt`

### Currently Displayed:
- ✅ `name`
- ✅ `url`
- ✅ `category`

### Missing from Display:
- ❌ `displayOrder` - **Should be used** (for sorting)

### Recommendation:
- Sort by `displayOrder` when displaying links

---

## VATReturn & CISReturn Models

### Schema Fields:
- VATReturn: `id`, `periodStart`, `periodEnd`, `salesVAT`, `purchaseVAT`, `netVAT`, `submittedDate`, `notes`, `createdAt`, `updatedAt`
- CISReturn: `id`, `month`, `year`, `totalDeductions`, `contractorsCount`, `submittedDate`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- Need to check reports page

### Recommendation:
- Ensure all fields are displayed in reports

---

## Employee Model

### Schema Fields:
- `id`, `name`, `email`, `phone`, `employeeId`, `notes`, `createdAt`, `updatedAt`

### Currently Displayed:
- Need to check if there's an employees page

### Recommendation:
- Create employees page if not exists

---

## General Recommendations

### 1. Add Detail Views/Modals
Many fields are appropriate for detail views rather than list views:
- Create "View Details" modals for each entity
- Show all fields in detail view
- Keep list views focused on key information

### 2. Missing Pages
- **Subcontractors page** - Currently only shown in payroll
- **Employees page** - If managing employees
- **Detail pages** for each entity

### 3. Important Missing Fields in List Views
- Invoice: `subtotal`, `vatAmount`, `paymentDate`, `paymentMethod`
- Client: `vatNumber`, `billingAddress`, `notes`
- Timesheet: `submittedVia`, `approvedBy`, `approvedAt`
- Subcontractor: All contact details, NI number, UTR

### 4. Sensitive Data
- `bankDetails` in Subcontractor - Should only be shown in secure detail view
- Consider encryption for sensitive fields

### 5. Form Fields
When implementing CRUD operations, ensure forms include ALL schema fields, not just displayed ones.

---

## Action Items

1. ✅ Document all missing fields (this document)
2. ⬜ Create detail view modals/pages for each entity
3. ⬜ Add missing columns to list views where appropriate
4. ⬜ Create Subcontractors management page
5. ⬜ Ensure all fields are included in create/edit forms
6. ⬜ Add sorting by `displayOrder` for QuickLinks
7. ⬜ Show sensitive fields (bankDetails) only in secure views
