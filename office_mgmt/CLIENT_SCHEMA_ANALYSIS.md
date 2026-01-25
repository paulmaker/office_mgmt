# Client Invoice Schema Analysis (Sales & Purchase)

## Overview
This document analyzes the potential client's sales and purchase invoice schema requirements against our current system capabilities.

---

## Field-by-Field Comparison

| Client Field | Current System | Status | Notes |
|-------------|----------------|--------|-------|
| **Invoice No** | `invoiceNumber` | ✅ **Supported** | Direct match |
| **Date Invoice Sent** | `date` (invoice date) | ⚠️ **Partial** | We have invoice date, but not a separate "sent" date field. Status can be SENT, but no timestamp. |
| **Scheme** | None | ❌ **Missing** | No equivalent field. Could be a payment scheme, project scheme, or tax regime identifier. |
| **Description** | `lineItems` (JSON array) | ⚠️ **Partial** | We store line items in JSON, but no single description field. Could extract from lineItems or add a description field. |
| **Date Balance Received** | `paymentDate` | ✅ **Supported** | Direct match - populated when invoice status is PAID |
| **Amount** | `subtotal` or `total` | ⚠️ **Unclear** | Need clarification: Is this net amount (before VAT) or total amount? We have both `subtotal` and `total`. |
| **VAT** | `vatAmount` | ✅ **Supported** | Direct match |
| **VAT DUE OR VAT REVERSE** | `reverseCharge` (boolean) | ⚠️ **Partial** | We have a boolean flag, but not an explicit enum/field that says "VAT DUE" vs "VAT REVERSE". Could derive from `reverseCharge` field. |
| **VAT REVERSE** | `reverseCharge` (boolean) | ⚠️ **Partial** | We track if reverse charge applies, but don't have a separate `vatReverseChargeAmount` field. If reverse charge is true, VAT amount would be the reverse charge amount. |
| **CIS 20% TAX** | `cisDeduction` (on invoices) | ⚠️ **Partial** | We have `cisDeduction` field on Invoice model, but it's currently only used for purchase invoices (from subcontractors). For sales invoices, CIS would be deducted BY the client FROM us. This is a new use case. |
| **NET** | `subtotal` | ⚠️ **Unclear** | We have `subtotal` which is before VAT. Need to confirm if "NET" means before VAT or after CIS deduction. |
| **Job Balance** | None (on Invoice) | ❌ **Missing** | No field to track job balance on invoice. Job model has `price` and `invoicePaid` boolean, but no balance tracking. |
| **Outstanding Balance on Job** | None | ❌ **Missing** | No field to track outstanding balance on job. Would need to calculate from job price minus paid invoices. |

---

## Summary

### ✅ Fully Supported (4 fields)
- Invoice No
- Date Balance Received (paymentDate)
- VAT (vatAmount)
- Date Invoice Sent (can use `date` field, but see notes)

### ⚠️ Partially Supported (7 fields)
- Date Invoice Sent - Has date but not specifically "sent" timestamp
- Description - Has lineItems JSON but no single description field
- Amount - Has both subtotal and total, need clarification
- VAT DUE OR VAT REVERSE - Has reverseCharge boolean, can derive
- VAT REVERSE - Has reverseCharge boolean, vatAmount when reverseCharge=true
- CIS 20% TAX - Has cisDeduction field but not used for sales invoices
- NET - Has subtotal, need clarification on definition

### ❌ Missing (3 fields)
- **Scheme** - No equivalent field
- **Job Balance** - No field on invoice to track job balance
- **Outstanding Balance on Job** - No field to track outstanding job balance

---

## Required Schema Changes

### 1. Add `sentDate` field (Optional but recommended)
```prisma
sentDate DateTime?  // Date invoice was sent to client
```

### 2. Add `scheme` field (Required)
```prisma
scheme String?  // Payment scheme, project scheme, or tax regime identifier
```

### 3. Add `description` field (Optional - can derive from lineItems)
```prisma
description String?  // General description (in addition to lineItems)
```

### 4. Support CIS on Sales Invoices (Required)
The `cisDeduction` field already exists on Invoice model, but we need to:
- Allow CIS deduction on SALES invoices (currently only on PURCHASE)
- Update invoice creation/editing logic to handle CIS on sales invoices
- Update calculations to apply CIS deduction when client deducts from our sales invoices

### 5. Add Job Balance Tracking (Required)
Two options:

**Option A: Add fields to Invoice model**
```prisma
jobBalance Float?  // Balance associated with job at time of invoice
outstandingJobBalance Float?  // Outstanding balance on job after invoice
```

**Option B: Calculate dynamically from Job model**
- Add `balance` field to Job model
- Calculate outstanding balance = job.price - sum of related invoice totals
- Update Job model when invoices are created/paid

**Recommendation:** Option B is better as it maintains data integrity and avoids duplication.

### 6. Add Job Balance fields to Job model (Recommended)
```prisma
// In Job model, add:
balance Float @default(0)  // Current balance (price - paid invoices)
lastBalanceUpdate DateTime?  // Last time balance was updated
```

### 7. Clarify Amount vs NET fields
- **Amount**: Should this be `subtotal` (before VAT) or `total` (after VAT)?
- **NET**: Should this be `subtotal` (before VAT) or `subtotal - cisDeduction` (after CIS)?

---

## Implementation Priority

### High Priority (Must Have)
1. ✅ Add `scheme` field to Invoice model
2. ✅ Support CIS deduction on SALES invoices (field exists, need logic update)
3. ✅ Add job balance tracking (add to Job model, calculate from invoices)

### Medium Priority (Should Have)
4. ⚠️ Add `sentDate` field to Invoice model
5. ⚠️ Add `description` field to Invoice model (or ensure lineItems can serve this purpose)

### Low Priority (Nice to Have)
6. ⚠️ Clarify and document Amount vs NET field usage
7. ⚠️ Add explicit VAT type enum (VAT_DUE vs VAT_REVERSE) instead of just boolean

---

## Questions for Client

1. **What does "Scheme" refer to?** (Payment scheme, project scheme, tax regime?)
2. **What does "Amount" represent?** (Net before VAT, or total including VAT?)
3. **What does "NET" represent?** (Before VAT, or after CIS deduction?)
4. **How is CIS applied to sales invoices?** (Is the client deducting CIS from our invoices to them?)
5. **How should Job Balance be calculated?** (Is it the job price, or remaining balance after previous invoices?)

---

## Recommended Migration Plan

### Phase 1: Critical Fields (Week 1)
1. Add `scheme` field to Invoice model
2. Add `balance` and `lastBalanceUpdate` to Job model
3. Update invoice creation logic to support CIS on sales invoices
4. Add job balance calculation logic

### Phase 2: Enhanced Tracking (Week 2)
5. Add `sentDate` field to Invoice model
6. Add `description` field to Invoice model (if needed)
7. Update invoice forms to include new fields
8. Update invoice display/export to show new fields

### Phase 3: Reporting & Validation (Week 3)
9. Update reports to include scheme and job balance data
10. Add validation for new fields
11. Update invoice export to match client's schema format

---

## Estimated Effort

- **Schema Changes**: 2-3 hours
- **Database Migration**: 1 hour
- **Server Actions Updates**: 4-6 hours
- **UI Form Updates**: 3-4 hours
- **Display/Export Updates**: 2-3 hours
- **Testing**: 3-4 hours

**Total Estimated Time**: 15-21 hours (2-3 days)

---

## Notes

- The `cisDeduction` field already exists on Invoice model, so supporting CIS on sales invoices is mainly a logic change
- Job balance tracking can be implemented by adding fields to Job model and calculating from related invoices
- Most other fields are straightforward additions
- The "Scheme" field needs clarification on what it represents

---

# Purchase Invoice Schema Analysis

## Overview
This section analyzes the client's purchase invoice schema requirements against our current system capabilities.

---

## Field-by-Field Comparison (Purchase Invoices)

| Client Field | Current System | Status | Notes |
|-------------|----------------|--------|-------|
| **Invoice No** | `invoiceNumber` | ✅ **Supported** | Direct match |
| **Date Received** | `date` (invoice date) | ⚠️ **Partial** | We have invoice date, but not a separate "received" date field. Could use `date` field or add `receivedDate`. |
| **Supplier** | `supplierId` + `supplier` relation | ✅ **Supported** | Direct match - we have Supplier model and relation |
| **Description** | `lineItems` (JSON array) | ⚠️ **Partial** | We store line items in JSON, but no single description field. Could extract from lineItems or add a description field. |
| **NET** | `subtotal` | ⚠️ **Unclear** | We have `subtotal` which is before VAT. Need to confirm if "NET" means before VAT or after CIS deduction. |
| **VAT** | `vatAmount` | ✅ **Supported** | Direct match |
| **CIS TAX 20%** | `cisDeduction` | ✅ **Supported** | Direct match - already used for purchase invoices from subcontractors |
| **GROSS** | `total` | ⚠️ **Unclear** | We have `total` field. Need clarification: Is GROSS the total after VAT, or final amount after all deductions (VAT + CIS)? |
| **Invoice Paid** | `status` (PAID) + `paymentDate` | ✅ **Supported** | Direct match - status field includes PAID status, paymentDate tracks when paid |
| **Date on Bank Statement** | `paymentDate` | ⚠️ **Partial** | We have `paymentDate` which could be used, but a dedicated "bank statement date" field might be preferred for reconciliation accuracy |
| **Details** | `notes` | ⚠️ **Partial** | We have `notes` field, but client may want a separate "Details" field for structured information vs general notes |

---

## Purchase Invoice Summary

### ✅ Fully Supported (5 fields)
- Invoice No (`invoiceNumber`)
- Supplier (`supplierId` + relation)
- VAT (`vatAmount`)
- CIS TAX 20% (`cisDeduction` - already used for purchase invoices)
- Invoice Paid (`status` + `paymentDate`)

### ⚠️ Partially Supported (5 fields)
- Date Received - Has `date` but not specifically "received" timestamp
- Description - Has `lineItems` JSON but no single description field
- NET - Has `subtotal`, need clarification on definition
- GROSS - Has `total`, need clarification on definition
- Date on Bank Statement - Has `paymentDate`, but dedicated field might be preferred
- Details - Has `notes`, but may need separate field

### ❌ Missing (0 fields)
- All critical fields are either supported or partially supported

---

## Purchase Invoice Required Schema Changes

### 1. Add `receivedDate` field (Optional but recommended)
```prisma
receivedDate DateTime?  // Date purchase invoice was received from supplier
```

### 2. Add `description` field (Optional - can derive from lineItems)
```prisma
description String?  // General description (in addition to lineItems)
```

### 3. Add `bankStatementDate` field (Optional but recommended)
```prisma
bankStatementDate DateTime?  // Date payment appeared on bank statement (for reconciliation)
```

### 4. Add `details` field (Optional - can use notes)
```prisma
details String?  // Structured details field (separate from general notes)
```

### 5. Clarify NET vs GROSS fields
- **NET**: Should this be `subtotal` (before VAT) or `subtotal - cisDeduction` (after CIS)?
- **GROSS**: Should this be `total` (subtotal + VAT) or `total - cisDeduction` (final amount after all deductions)?

---

## Combined Analysis: Sales vs Purchase Invoices

### Fields Common to Both
| Field | Sales Invoice | Purchase Invoice | Status |
|-------|---------------|------------------|--------|
| Invoice No | ✅ Supported | ✅ Supported | ✅ Complete |
| Date (Sent/Received) | ⚠️ Partial | ⚠️ Partial | ⚠️ Needs `sentDate`/`receivedDate` |
| Description | ⚠️ Partial | ⚠️ Partial | ⚠️ Needs `description` field |
| NET | ⚠️ Unclear | ⚠️ Unclear | ⚠️ Needs clarification |
| VAT | ✅ Supported | ✅ Supported | ✅ Complete |
| GROSS/Total | ⚠️ Unclear | ⚠️ Unclear | ⚠️ Needs clarification |

### Sales Invoice Specific Fields
- Scheme - ❌ Missing
- Date Balance Received - ✅ Supported (`paymentDate`)
- VAT DUE OR VAT REVERSE - ⚠️ Partial (`reverseCharge` boolean)
- VAT REVERSE - ⚠️ Partial (`reverseCharge` boolean)
- CIS 20% TAX - ⚠️ Partial (field exists, not used for sales)
- Job Balance - ❌ Missing
- Outstanding Balance on Job - ❌ Missing

### Purchase Invoice Specific Fields
- Supplier - ✅ Supported (`supplierId` + relation)
- CIS TAX 20% - ✅ Supported (`cisDeduction` - already in use)
- Invoice Paid - ✅ Supported (`status` + `paymentDate`)
- Date on Bank Statement - ⚠️ Partial (`paymentDate` exists, dedicated field preferred)
- Details - ⚠️ Partial (`notes` exists, separate field may be preferred)

---

## Combined Required Schema Changes

### High Priority (Must Have)
1. ✅ Add `scheme` field to Invoice model (for sales invoices)
2. ✅ Add `receivedDate` field to Invoice model (for purchase invoices)
3. ✅ Add `bankStatementDate` field to Invoice model (for purchase invoices)
4. ✅ Support CIS deduction on SALES invoices (field exists, need logic update)
5. ✅ Add job balance tracking (add to Job model, calculate from invoices)

### Medium Priority (Should Have)
6. ⚠️ Add `sentDate` field to Invoice model (for sales invoices)
7. ⚠️ Add `description` field to Invoice model (for both types)
8. ⚠️ Add `details` field to Invoice model (for purchase invoices, or use notes)

### Low Priority (Nice to Have)
9. ⚠️ Clarify and document NET vs GROSS field usage
10. ⚠️ Add explicit VAT type enum (VAT_DUE vs VAT_REVERSE) instead of just boolean

---

## Combined Questions for Client

### Sales Invoice Questions
1. **What does "Scheme" refer to?** (Payment scheme, project scheme, tax regime?)
2. **What does "Amount" represent?** (Net before VAT, or total including VAT?)
3. **What does "NET" represent?** (Before VAT, or after CIS deduction?)
4. **How is CIS applied to sales invoices?** (Is the client deducting CIS from our invoices to them?)
5. **How should Job Balance be calculated?** (Is it the job price, or remaining balance after previous invoices?)

### Purchase Invoice Questions
6. **What does "NET" represent?** (Before VAT, or after CIS deduction?)
7. **What does "GROSS" represent?** (Subtotal + VAT, or final amount after all deductions including CIS?)
8. **Is "Date on Bank Statement" different from payment date?** (Should we have a separate field?)
9. **What should go in "Details" vs "Notes"?** (Should we have separate fields?)

---

## Combined Recommended Migration Plan

### Phase 1: Critical Fields (Week 1)
1. Add `scheme` field to Invoice model (sales invoices)
2. Add `receivedDate` field to Invoice model (purchase invoices)
3. Add `bankStatementDate` field to Invoice model (purchase invoices)
4. Add `balance` and `lastBalanceUpdate` to Job model
5. Update invoice creation logic to support CIS on sales invoices
6. Add job balance calculation logic

### Phase 2: Enhanced Tracking (Week 2)
7. Add `sentDate` field to Invoice model (sales invoices)
8. Add `description` field to Invoice model (both types)
9. Add `details` field to Invoice model (purchase invoices, or clarify use of notes)
10. Update invoice forms to include new fields
11. Update invoice display/export to show new fields

### Phase 3: Reporting & Validation (Week 3)
12. Update reports to include all new fields
13. Add validation for new fields
14. Update invoice export to match client's schema format for both sales and purchase invoices
15. Add logic to calculate NET and GROSS based on client's definitions

---

## Combined Estimated Effort

- **Schema Changes**: 3-4 hours (more fields than sales only)
- **Database Migration**: 1-2 hours
- **Server Actions Updates**: 6-8 hours (both sales and purchase logic)
- **UI Form Updates**: 4-6 hours (both invoice types)
- **Display/Export Updates**: 3-4 hours (both invoice types)
- **Testing**: 4-5 hours

**Total Estimated Time**: 21-29 hours (3-4 days)

---

## Combined Notes

- Purchase invoices are generally better supported than sales invoices
- CIS deduction already works for purchase invoices (from subcontractors)
- The `cisDeduction` field exists on Invoice model, so supporting CIS on sales invoices is mainly a logic change
- Job balance tracking can be implemented by adding fields to Job model and calculating from related invoices
- Most fields are straightforward additions
- The "Scheme" field needs clarification on what it represents
- NET vs GROSS definitions need clarification for both invoice types
