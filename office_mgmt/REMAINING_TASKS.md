# Remaining Tasks from Implementation Plans

**Date:** January 23, 2025  
**Status:** Review of Completed vs. Pending Items

---

## ✅ Completed (All Phase 1 & Most Phase 2)

### Phase 1: Critical for First Client
- ✅ Clients - referenceCode field with auto-generation (6-digit format)
- ✅ Jobs - Full CRUD with multi-employee and line items
- ✅ Invoice Codes - Model and invoice number generation
- ✅ Invoices - CRUD with job selection and reverse VAT
- ✅ Employees - car field and full CRUD
- ✅ Assets - New fields (leaseExpiryDate, merseyFlow, companyCar)

### Phase 2: Important Features
- ✅ Suppliers - Full CRUD
- ✅ Job Prices - Full CRUD
- ✅ Timesheets - New fields (submittedDate, expenses, receiptsReceived) and CRUD

---

## 🚧 Still Pending / Needs Enhancement

### 1. **Payroll Enhancements** (Phase 2, Item 9)
**Status:** Partially Complete - Basic timesheet fields added, but payroll breakdown not implemented

**What's Missing:**
- ❌ Additional hours at special rates (not in timesheet model)
- ❌ Multiple detail rows breakdown in payroll page
- ❌ Payroll page doesn't show expenses breakdown per timesheet
- ❌ No way to add multiple expense items per timesheet

**Options:**
- **Option A:** Add `additionalHours` and `additionalHoursRate` fields to Timesheet model
- **Option B:** Create separate `PayrollEntry` model for detailed breakdown

**Recommendation:** Start with Option A (simpler), add fields to Timesheet model

---

### 2. **JobPrices Integration** (Mentioned in Notes)
**Status:** CRUD exists, but not integrated with Jobs/Invoices forms

**What's Missing:**
- ❌ When creating a Job, should auto-populate line items from JobPrices for that client
- ❌ When creating an Invoice, should allow selecting JobPrices to auto-populate line items
- ❌ Job form doesn't show/use JobPrices
- ❌ Invoice form doesn't show/use JobPrices

**Action Required:**
- Update Job form to:
  - Show JobPrices for selected client
  - Allow selecting JobPrices to auto-populate line items
- Update Invoice form to:
  - Show JobPrices for selected client
  - Allow selecting JobPrices to auto-populate line items

---

### 3. **Reconciliation Feature** (Phase 3, Item 11)
**Status:** Schema fields exist, but no UI/functionality

**What's Missing:**
- ❌ Bank CSV import functionality
- ❌ Transaction matching UI (match to invoices/timesheets)
- ❌ Reconciliation page/UI
- ❌ PDF remittance upload and linking
- ❌ File upload capability

**Schema Ready:**
- ✅ `BankTransaction` has: `reconciliationDate`, `reconciledBy`, `linkedInvoiceId`, `linkedTimesheetId`, `documentUrl`

**Action Required:**
- Create Reconciliation page (`app/(dashboard)/banking/page.tsx` - update existing)
- Add CSV import functionality
- Add transaction matching UI
- Add PDF upload (use Vercel Blob or similar)
- Create bank transaction CRUD actions

---

### 4. **Email Parsing for Timesheets** (Phase 3, Item 12)
**Status:** Future enhancement - not critical

**What's Missing:**
- ❌ Email parsing utility to convert contractor emails into timesheets
- ❌ Email integration (if needed)

**Priority:** Low - can be done later

---

### 5. **Password Management** (From CURRENT_STATUS.md)
**Status:** Currently disabled for development

**What's Missing:**
- ❌ Add `password` field to User model
- ❌ Hash passwords on creation (use bcrypt)
- ❌ Verify passwords on login
- ❌ Password reset functionality

**Action Required:**
- Update User model schema
- Update authentication route to hash/verify passwords
- Add password reset flow (optional)

---

### 6. **Module Toggling** (From CURRENT_STATUS.md)
**Status:** Infrastructure exists, not implemented

**What's Missing:**
- ❌ Module configuration utilities
- ❌ Module access checks in routes/components
- ❌ Admin UI for toggling modules per tenant
- ❌ Sidebar filtering based on enabled modules

**Action Required:**
- Create module configuration utilities
- Add module checks to routes
- Create admin UI for module management
- Filter sidebar based on enabled modules

---

## 🎯 Recommended Priority Order

### High Priority (For First Client)
1. **JobPrices Integration** - Auto-populate in Jobs/Invoices forms
2. **Payroll Enhancements** - Add additional hours support

### Medium Priority
3. **Reconciliation Feature** - Bank import and matching
4. **Password Management** - Enable password authentication

### Low Priority (Future)
5. **Module Toggling** - Enable/disable modules per tenant
6. **Email Parsing** - Parse contractor emails

---

## 📋 Quick Implementation Checklist

### JobPrices Integration
- [ ] Update `components/jobs/job-form.tsx` to:
  - Load JobPrices when client is selected
  - Show JobPrices in a selectable list
  - Auto-populate line items when JobPrice is selected
- [ ] Update `components/invoices/invoice-form.tsx` to:
  - Load JobPrices when client is selected
  - Show JobPrices in a selectable list
  - Auto-populate line items when JobPrice is selected

### Payroll Enhancements
- [ ] Add `additionalHours` and `additionalHoursRate` to Timesheet model
- [ ] Create migration
- [ ] Update timesheet form to include additional hours fields
- [ ] Update payroll page to show detailed breakdown
- [ ] Calculate total including additional hours

### Reconciliation
- [ ] Create/update `app/actions/bank-transactions.ts`
- [ ] Update `app/(dashboard)/banking/page.tsx` with:
  - CSV import functionality
  - Transaction matching UI
  - Reconciliation workflow
- [ ] Add PDF upload capability (Vercel Blob integration)

---

## 📝 Notes

- Most critical items for first client are complete
- JobPrices integration is the most important missing piece for workflow efficiency
- Reconciliation can be done after first client testing
- Password management can wait until production deployment
- Module toggling is nice-to-have for multi-tenant flexibility
