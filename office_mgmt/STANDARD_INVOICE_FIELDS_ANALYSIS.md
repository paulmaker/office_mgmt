# Standard Invoice Fields Analysis

## Overview
This document identifies standard invoice fields used across industries and accounting practices to ensure our system is generic and reusable without bespoke development.

---

## UK Legal Requirements (HMRC)

### Mandatory Fields (All Invoices)
1. ✅ **Unique invoice number** - `invoiceNumber` ✅
2. ✅ **Invoice date** - `date` ✅
3. ✅ **Seller's name and address** - (from Entity/Company settings)
4. ✅ **Buyer's name and address** - (from Client/Supplier relations) ✅
5. ✅ **Description of goods/services** - `lineItems` (JSON) ⚠️
6. ✅ **Total amount** - `total` ✅
7. ✅ **VAT amount** (if applicable) - `vatAmount` ✅
8. ✅ **VAT number** (if VAT registered) - (from Entity/Client settings)

### VAT Invoice Requirements
9. ✅ **VAT registration number** - (from Entity settings)
10. ✅ **VAT rate** - `vatRate` ✅
11. ✅ **VAT amount** - `vatAmount` ✅
12. ⚠️ **Reverse charge indicator** - `reverseCharge` (boolean) ⚠️ (could be more explicit)

---

## Standard Accounting Fields (Industry Best Practice)

### Date & Time Tracking
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| Invoice date | `date` | ✅ | Required |
| Due date | `dueDate` | ✅ | Required |
| Date sent | None | ❌ | **High** - Standard practice |
| Date received | None | ❌ | **High** - For purchase invoices |
| Date paid | `paymentDate` | ✅ | Required |
| Date on bank statement | None | ❌ | **Medium** - For reconciliation |
| Tax point date | None | ❌ | **Medium** - VAT requirement (usually same as invoice date) |

### Financial Fields
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| Subtotal (net) | `subtotal` | ✅ | Required |
| Discount amount | None | ❌ | **High** - Very common |
| Discount percentage | None | ❌ | **High** - Very common |
| VAT rate | `vatRate` | ✅ | Required |
| VAT amount | `vatAmount` | ✅ | Required |
| Total (gross) | `total` | ✅ | Required |
| Currency | None | ❌ | **Medium** - Multi-currency support |
| Exchange rate | None | ❌ | **Low** - If multi-currency |

### CIS (Construction Industry Scheme) Fields
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| CIS deduction amount | `cisDeduction` | ✅ | Required |
| CIS rate | `cisRate` | ✅ | Required |
| CIS verification number | None | ❌ | **Medium** - Should be on invoice (from subcontractor) |
| CIS status at time of invoice | None | ❌ | **Medium** - Snapshot for audit trail |

### Payment & Status
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| Status | `status` | ✅ | Required |
| Payment date | `paymentDate` | ✅ | Required |
| Payment method | `paymentMethod` | ✅ | Required |
| Payment reference | None | ❌ | **High** - Bank reference, cheque number, etc. |
| Partial payment amount | None | ❌ | **Medium** - For partial payments |
| Outstanding balance | None | ❌ | **High** - Calculated: total - paid amount |
| Credit note reference | None | ❌ | **Medium** - Link to credit notes |

### Reference & Tracking
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| Invoice number | `invoiceNumber` | ✅ | Required |
| Purchase order number | None | ❌ | **High** - Very common |
| Quote/Estimate reference | None | ❌ | **Medium** - Common practice |
| Project/Job reference | `lineItems` (jobId) | ⚠️ | Partial - in lineItems |
| Customer reference | None | ❌ | **Medium** - Client's internal ref |
| Supplier reference | None | ❌ | **Medium** - Supplier's invoice number |
| Contract reference | None | ❌ | **Low** - For contract-based work |
| Scheme/Programme | None | ❌ | **Medium** - From client requirements |

### Description & Line Items
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| General description | None | ❌ | **High** - Top-level description |
| Line items | `lineItems` (JSON) | ✅ | Required |
| Item description | In lineItems | ✅ | Required |
| Quantity | In lineItems | ✅ | Required |
| Unit price | In lineItems | ✅ | Required |
| Line total | In lineItems | ✅ | Required |
| Unit of measure | None | ❌ | **Medium** - hours, days, units, etc. |
| Product/service code | None | ❌ | **Low** - SKU, service codes |
| Tax code per line | None | ❌ | **Medium** - Different VAT rates per line |

### VAT Specific
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| VAT registration number | (Entity settings) | ⚠️ | Should be on invoice |
| Reverse charge | `reverseCharge` (boolean) | ⚠️ | Could be enum |
| VAT type | None | ❌ | **Medium** - Standard, Zero, Exempt, Reverse |
| VAT scheme | None | ❌ | **Low** - Flat rate, etc. |

### Additional Standard Fields
| Field | Current | Status | Priority |
|-------|---------|--------|----------|
| Terms & conditions | None | ❌ | **Low** - Usually in settings |
| Payment terms (days) | (Client settings) | ⚠️ | Should be visible on invoice |
| Delivery address | None | ❌ | **Medium** - Different from billing |
| Shipping method | None | ❌ | **Low** - For goods |
| Shipping cost | None | ❌ | **Low** - For goods |
| Notes | `notes` | ✅ | Standard |
| Internal notes | None | ❌ | **Medium** - Private notes vs public notes |
| Attachments | None | ❌ | **High** - PDF, images, documents |
| Email sent | None | ❌ | **Medium** - Track if emailed |
| Email sent date | None | ❌ | **Medium** - When emailed |
| Reminder sent | None | ❌ | **Low** - Payment reminders |

---

## Recommended Additions for Generic System

### High Priority (Standard Practice)

#### 1. Date Tracking
```prisma
sentDate DateTime?           // When invoice was sent (sales)
receivedDate DateTime?        // When invoice was received (purchase)
bankStatementDate DateTime?   // Date on bank statement
taxPointDate DateTime?        // VAT tax point date (usually = date)
```

#### 2. Payment Tracking
```prisma
paymentReference String?      // Bank ref, cheque number, etc.
paidAmount Float @default(0)  // For partial payments
outstandingAmount Float        // Calculated: total - paidAmount
```

#### 3. Discounts
```prisma
discountAmount Float @default(0)
discountPercentage Float @default(0)
discountType String?          // "PERCENTAGE" | "FIXED"
```

#### 4. References
```prisma
purchaseOrderNumber String?   // PO number from client
quoteReference String?         // Quote/estimate reference
customerReference String?      // Client's internal reference
supplierReference String?      // Supplier's invoice number (purchase)
scheme String?                // From client requirements
```

#### 5. Description
```prisma
description String?            // General description (top-level)
```

#### 6. Attachments
```prisma
attachments Json?              // Array of file URLs/keys
```

### Medium Priority (Common Practice)

#### 7. CIS Audit Trail
```prisma
cisVerificationNumber String?  // Snapshot at invoice time
cisStatusAtInvoice CISStatus? // Snapshot for audit
```

#### 8. Email Tracking
```prisma
emailSent Boolean @default(false)
emailSentDate DateTime?
emailSentTo String?            // Email address sent to
```

#### 9. Delivery/Shipping
```prisma
deliveryAddress String?        // Different from billing
shippingMethod String?
shippingCost Float @default(0)
```

#### 10. Notes Separation
```prisma
publicNotes String?            // Notes visible to client
internalNotes String?          // Private notes (separate from notes)
```

#### 11. VAT Enhancement
```prisma
vatType String?                // "STANDARD" | "ZERO" | "EXEMPT" | "REVERSE"
vatRegistrationNumber String?   // On invoice (from entity)
```

### Low Priority (Nice to Have)

#### 12. Multi-Currency
```prisma
currency String @default("GBP")
exchangeRate Float @default(1.0)
baseCurrencyAmount Float?       // Amount in base currency
```

#### 13. Line Item Enhancements
```prisma
// In lineItems JSON, add:
unitOfMeasure String?          // "hours", "days", "units", etc.
productCode String?            // SKU, service code
taxCode String?                // VAT code for this line
```

#### 14. Credit Notes
```prisma
creditNoteId String?           // Link to credit note
creditNoteReference String?
```

---

## Updated Invoice Model Recommendation

```prisma
model Invoice {
  id                String        @id @default(cuid())
  entityId          String
  invoiceNumber     String
  type              InvoiceType
  clientId          String?
  subcontractorId   String?
  supplierId        String?
  
  // Dates
  date              DateTime      @default(now())
  taxPointDate      DateTime?     // VAT tax point (usually = date)
  dueDate           DateTime
  sentDate          DateTime?     // When sent (sales)
  receivedDate      DateTime?     // When received (purchase)
  paymentDate       DateTime?
  bankStatementDate DateTime?     // Date on bank statement
  emailSentDate     DateTime?
  
  // Financial
  subtotal          Float
  discountAmount    Float         @default(0)
  discountPercentage Float        @default(0)
  discountType      String?       // "PERCENTAGE" | "FIXED"
  vatAmount         Float         @default(0)
  vatRate           Float         @default(20)
  vatType           String?       // "STANDARD" | "ZERO" | "EXEMPT" | "REVERSE"
  vatRegistrationNumber String?   // On invoice
  cisDeduction      Float         @default(0)
  cisRate           Float         @default(0)
  cisVerificationNumber String?   // Snapshot at invoice time
  cisStatusAtInvoice CISStatus?   // Snapshot for audit
  reverseCharge     Boolean       @default(false)
  total             Float
  paidAmount        Float         @default(0)
  outstandingAmount Float         // Calculated
  
  // Status & Payment
  status            InvoiceStatus @default(DRAFT)
  paymentMethod     String?
  paymentReference  String?       // Bank ref, cheque number
  
  // References
  purchaseOrderNumber String?
  quoteReference     String?
  customerReference   String?      // Client's internal ref
  supplierReference   String?      // Supplier's invoice number
  scheme              String?      // Payment scheme, project scheme
  creditNoteId       String?
  creditNoteReference String?
  
  // Description & Items
  description       String?       // General description
  lineItems         Json          // Array of line items
  publicNotes       String?       // Visible to client
  internalNotes      String?       // Private notes
  
  // Delivery/Shipping
  deliveryAddress   String?       // Different from billing
  shippingMethod    String?
  shippingCost      Float         @default(0)
  
  // Attachments & Communication
  attachments       Json?         // Array of file URLs/keys
  emailSent         Boolean       @default(false)
  emailSentTo       String?
  
  // Currency (if multi-currency)
  currency          String        @default("GBP")
  exchangeRate      Float         @default(1.0)
  
  // Audit
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  
  // Relations
  entity            Entity        @relation(fields: [entityId], references: [id], onDelete: Cascade)
  client            Client?       @relation("ClientSalesInvoices", fields: [clientId], references: [id])
  subcontractor     Subcontractor? @relation("SubcontractorPurchaseInvoices", fields: [subcontractorId], references: [id])
  supplier          Supplier?     @relation("SupplierPurchaseInvoices", fields: [supplierId], references: [id])
  bankTransactions  BankTransaction[]
  creditNote        Invoice?      @relation("CreditNotes", fields: [creditNoteId], references: [id])
  
  @@unique([entityId, invoiceNumber])
  @@index([entityId])
  @@index([status])
  @@index([dueDate])
}
```

---

## Implementation Priority

### Phase 1: Critical Standard Fields (Week 1)
1. ✅ `sentDate` / `receivedDate` - Standard practice
2. ✅ `description` - Top-level description
3. ✅ `purchaseOrderNumber` - Very common
4. ✅ `paymentReference` - Essential for reconciliation
5. ✅ `paidAmount` / `outstandingAmount` - For partial payments
6. ✅ `discountAmount` / `discountPercentage` - Very common
7. ✅ `scheme` - From client requirements

### Phase 2: Enhanced Tracking (Week 2)
8. ✅ `bankStatementDate` - Better reconciliation
9. ✅ `emailSent` / `emailSentDate` - Communication tracking
10. ✅ `publicNotes` / `internalNotes` - Notes separation
11. ✅ `attachments` - Document storage
12. ✅ `customerReference` / `supplierReference` - Reference tracking

### Phase 3: Advanced Features (Week 3+)
13. ✅ `vatType` - Better VAT handling
14. ✅ `cisVerificationNumber` / `cisStatusAtInvoice` - CIS audit trail
15. ✅ Multi-currency support (if needed)
16. ✅ Credit note linking

---

## Summary

### Currently Missing (High Priority)
- ❌ `sentDate` / `receivedDate`
- ❌ `description` (top-level)
- ❌ `purchaseOrderNumber`
- ❌ `paymentReference`
- ❌ `paidAmount` / `outstandingAmount`
- ❌ `discountAmount` / `discountPercentage`
- ❌ `scheme`
- ❌ `attachments`

### Currently Missing (Medium Priority)
- ❌ `bankStatementDate`
- ❌ `emailSent` / `emailSentDate`
- ❌ `publicNotes` / `internalNotes`
- ❌ `customerReference` / `supplierReference`
- ❌ `vatType`
- ❌ `cisVerificationNumber` / `cisStatusAtInvoice`

### Currently Supported
- ✅ All mandatory UK legal requirements
- ✅ Basic financial fields
- ✅ CIS deduction fields
- ✅ Payment tracking (basic)
- ✅ Line items (JSON)

---

## Recommendation

Implement **Phase 1** fields to make the system generic and cover standard practices. These fields are commonly used across industries and will reduce the need for bespoke development.

**Estimated Effort for Phase 1**: 15-20 hours (2-3 days)
