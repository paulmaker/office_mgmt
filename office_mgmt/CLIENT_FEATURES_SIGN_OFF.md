# Office Management System — Feature Summary for Client Sign-Off

**Document purpose:** Summary of all application features for client review and sign-off.  
**Last updated:** March 2026  
**Status:** In development — ready for feature confirmation.

---

## 1. Overview

The Office Management System is a web application for managing clients, jobs, invoices, timesheets, CIS payroll, bank reconciliation, assets, and reporting. It supports multiple organisations and companies (multi-tenant) with configurable modules and role-based access.

**Core capabilities:**
- **Multi-tenant:** Organisations contain one or more Companies; each company has its own data.
- **Configurable modules:** An admin can enable or disable modules (e.g. CIS Payroll, Assets) per company.
- **Role-based access:** Platform Admin, Account Admin, Entity Admin, and Entity User with appropriate permissions.

---

## 2. Feature Summary by Area

### 2.1 Dashboard
- **Overview:** Main landing page after login.
- **Features:**
  - KPI-style summary (revenue, profit, outstanding invoices, overdue amounts).
  - Pending timesheets count.
  - VAT collected summary.
  - Recent invoices and timesheets.
  - Activity-style feed.
- **Status:** UI in place; KPIs can be wired to live data as needed.

---

### 2.2 People & Contacts

#### Clients
- Full client list with search.
- Client details: name, company, contact info, address, payment terms.
- VAT registration and CIS registration with badges.
- **Reference codes:** Auto-generated format (e.g. BS000001) for invoice numbering.
- Create, edit, delete (with permissions).
- Statistics: total clients, VAT registered, CIS registered.
- **Status:** Implemented with real CRUD and database.

#### Subcontractors
- List of subcontractors with search.
- CIS fields: NI Number, UTR, CIS status (Verified Gross / Verified Net / Not Verified), verification number.
- Email uniqueness per company.
- Create, edit, delete.
- **Status:** Implemented.

#### Employees
- Employee list with search.
- Fields: name, email, phone, employee ID, car (optional), notes.
- Create, edit, delete.
- **Status:** Implemented.

#### Suppliers
- Supplier list with search.
- Details: name, company, contact, address, VAT number, payment terms, notes.
- Link to purchase invoices.
- Create, edit, delete.
- **Status:** Implemented.

---

### 2.3 Jobs & Pricing

#### Jobs
- Jobs linked to clients.
- **Job number** for client reference.
- Multiple employees per job (2–3 via assignment).
- **Line items:** e.g. Bathroom, Living Room, Stairs — multiple rows per job.
- Totals derived from line items.
- Create, edit, delete.
- **Status:** Implemented.

#### Job Prices
- Per-client job prices (e.g. job type, description, price).
- Used to pre-fill job line items and invoice line items.
- Create, edit, delete.
- **Status:** Implemented.

---

### 2.4 Invoicing

- **Tabs:** All, Sales, Purchase, Overdue.
- **Invoice types:** Sales and Purchase.
- **Line items:** Description, quantity, rate, amount; link to jobs where applicable.
- **VAT:** Standard rate (configurable, default 20%); automatic calculation.
- **Reverse charge VAT:** Option for applicable invoices.
- **CIS:** CIS deduction tracking where relevant.
- **Statuses:** Draft, Sent, Paid, Overdue.
- **Invoice numbering:** Uses client reference code + sequence (e.g. client ref + next number).
- **Actions:** Create, edit, delete, mark as paid.
- **PDF:** Generate and download invoice PDFs.
- **Email:** Send invoices with PDF attachment (Resend integration).
- **Status:** Implemented including PDF and email.

---

### 2.5 Timesheets

- Timesheets linked to subcontractors.
- **Period:** Start and end date.
- **Hours, rate, gross amount.**
- **CIS deductions** by verification status:
  - Verified Gross: 0%
  - Verified Net: 20%
  - Not Verified: 30%
- **Workflow:** Submitted → Approve / Reject.
- **Extras:** Submitted date, expenses, receipts received (where implemented).
- Create, edit, approve, reject.
- **Status:** Implemented with approval workflow.

---

### 2.6 CIS Payroll

- View payroll summary by subcontractor.
- CIS verification status and deduction amounts.
- Timesheet-level breakdown.
- **Process Payments** and **CIS Return** actions: UI present; backend processing to be completed as needed.
- **Status:** UI and data in place; payment/CIS return processing can be finalised in a later phase.

---

### 2.7 Bank Reconciliation

- List of bank transactions with filters (e.g. reconciled / unreconciled).
- **Reconciliation:** Match transactions to invoices and/or timesheets.
- **Document attachment:** Upload and link PDF remittances (stored in AWS S3).
- **CSV import:** Import bank transactions from CSV.
- Unreconcile and delete where permitted.
- **Status:** Implemented including S3 uploads and CSV import.

---

### 2.8 Reports

- **Profit & Loss** — P&L view with export (CSV).
- **VAT Summary** — Input/output VAT with export (CSV).
- **CIS Deductions** — Summary with export (CSV).
- **Cash Flow** — Cash flow view with export (CSV).
- **Export All** — Combined CSV export for reports.
- **Status:** Implemented with real data and exports.

---

### 2.9 Asset Management

- **Types:** Vehicles and equipment.
- **Details:** Name, registration (if applicable), notes.
- **Reminders:**
  - MOT due date
  - Road tax due date
  - Insurance due date
  - Service due date
- **Reminder display:** Overdue, due soon (e.g. ≤7 days), upcoming (e.g. ≤30 days), current.
- **Optional fields:** Lease expiry, MerseyFlow, company car (where in schema).
- Create, edit, delete.
- **Status:** Implemented.

---

### 2.10 Quick Links

- Custom links (e.g. banking, HMRC CIS, HMRC VAT, suppliers).
- Categories and grid layout.
- Open in new tab.
- Create, edit, delete.
- **Status:** Implemented.

---

### 2.11 Settings

- **Company information:** Name, VAT number, contact details, etc.
- **Email configuration:** For sending invoices and system emails (Resend).
- **Notification preferences:** Configurable options.
- **CIS/VAT rates:** Configurable rates used in calculations.
- **Status:** Implemented and stored in company (Entity) settings.

---

### 2.12 Admin (Platform & Account Admins)

- **Organisations (TenantAccounts):** Create and manage organisations.
- **Companies (Entities):** Create and manage companies within an organisation.
- **Module access:** Per-company toggles for:
  - Clients, Subcontractors, Employees, Suppliers  
  - Jobs, Job Prices  
  - Invoices, Timesheets, CIS Payroll  
  - Bank Reconciliation, Reports  
  - Assets, Quick Links  
- **Users:** Invite users by email; set role and company; password setup via email link.
- **Status:** Implemented; module access controls which areas each company sees.

---

## 3. Security & Access

- **Authentication:** Email/password (NextAuth.js); password hashing (bcrypt).
- **Password flows:** Forgot password, reset password, invite new user with setup link.
- **Roles:**
  - **Platform Admin:** Full access across all organisations and companies.
  - **Account Admin:** Full access within their organisation (all companies).
  - **Entity Admin:** Full access within their company.
  - **Entity User:** Read/create/update on most resources; delete and approve restricted to admins.
- **Data isolation:** All business data scoped by company (Entity); users only see data for companies they can access.
- **Module access:** Sidebar and server actions respect per-company enabled modules; disabled modules are hidden and blocked.
- **Security headers:** CSP, HSTS, X-Frame-Options, and related headers configured.
- **File storage:** PDFs (e.g. remittances) stored in AWS S3 with secure access via app (e.g. presigned URLs / proxy).

---

## 4. Technical Summary (for reference)

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma, PostgreSQL (e.g. Vercel Postgres/Neon), TailwindCSS 4.
- **Email:** Resend for invoices, user invites, and password reset.
- **Files:** AWS S3 for uploads (e.g. bank remittance PDFs).
- **UI:** Responsive layout; dialogs and toasts for forms and feedback.

---

## 5. Known Limitations / In Progress

- **Payroll:** “Process Payments” and “CIS Return” buttons are in the UI; full end-to-end payment and CIS return processing can be completed in a later phase.
- **Dashboard:** KPI figures can be switched from placeholder/mock to live database figures when required.
- **Pagination:** List pages may not yet have full pagination; can be added if needed.
- **Error handling:** Additional error boundaries and user-facing error messages can be added for production hardening.

---

## 6. Client Sign-Off

Please review the features above and confirm that this summary matches your understanding of the application scope. Use the section below to record sign-off (or requested changes).

| Item | Description |
|------|-------------|
| **Feature scope** | The feature list in sections 2.1–2.12 accurately reflects the application scope. |
| **Security & access** | The security and access model (section 3) is acceptable. |
| **Known limitations** | The known limitations (section 5) are understood and accepted (or changes requested below). |

**Signed:** _____________________________  
**Name:** _____________________________  
**Role:** _____________________________  
**Date:** _____________________________

**Comments or requested changes (if any):**

_________________________________________________________________________  
_________________________________________________________________________  
_________________________________________________________________________

---

*This document was prepared from the project’s README, CURRENT_STATUS, MODULE_ACCESS_PLAN, MULTI_TENANT_RBAC_PLAN, CLIENT_REQUIREMENTS_ANALYSIS, IMPLEMENTATION_SUMMARY, and PRODUCTION_READINESS documentation.*
