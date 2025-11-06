# Office Management System

A comprehensive office management application built with Next.js for managing clients, invoices, CIS payroll, timesheets, and more.

## Features

### Core Functionality

- **Dashboard** - Real-time overview with KPIs and recent activity
- **Client Management** - Complete client database with VAT and CIS tracking
- **Invoice Management** - Sales and purchase invoices with PDF generation capability
- **Timesheet System** - Subcontractor timesheet submission and approval workflow
- **CIS Payroll** - Construction Industry Scheme payment processing with deductions
- **Bank Reconciliation** - Match transactions with invoices and payments
- **Reporting** - P&L statements, VAT summaries, CIS returns, and cash flow
- **Asset Management** - Vehicle and equipment tracking with MOT/tax/insurance reminders
- **Quick Links** - Customizable shortcuts to external services
- **Settings** - Company configuration, user management, and notifications

### Technical Features

- Built with **Next.js 16** (App Router)
- **TypeScript** for type safety
- **TailwindCSS 4** for styling
- **Prisma ORM** for database management
- **Mock data** included for immediate testing
- Responsive design
- Modern UI components

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL database (for production use)

### Installation

1. Install dependencies (already done)
```bash
npm install
```

2. Set up environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your database connection:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/office_mgmt"
```

3. Initialize the database (when ready to use real database)
```bash
npx prisma generate
npx prisma migrate dev
```

4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
office_mgmt/
├── app/
│   ├── (dashboard)/          # Dashboard routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── clients/          # Client management
│   │   ├── invoices/         # Invoice management
│   │   ├── timesheets/       # Timesheet system
│   │   ├── payroll/          # CIS payroll
│   │   ├── banking/          # Bank reconciliation
│   │   ├── reports/          # Financial reports
│   │   ├── assets/           # Asset management
│   │   ├── quick-links/      # Quick links
│   │   ├── settings/         # Settings
│   │   └── layout.tsx        # Dashboard layout with sidebar
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home (redirects to dashboard)
├── components/
│   ├── ui/                   # Reusable UI components
│   └── sidebar.tsx           # Navigation sidebar
├── lib/
│   ├── utils.ts              # Utility functions
│   ├── prisma.ts             # Prisma client
│   └── mock-data.ts          # Mock data for development
├── prisma/
│   └── schema.prisma         # Database schema
└── public/                   # Static assets
```

## Mock Data

The application includes comprehensive mock data for testing:

- 3 Clients (with varied VAT/CIS status)
- 3 Subcontractors (different CIS statuses)
- 4 Invoices (sales and purchase)
- 3 Timesheets (various approval states)
- 4 Bank Transactions
- 3 Company Assets (vehicles and equipment)
- 5 Quick Links

All pages are fully functional with this mock data.

## Key Features Explained

### CIS Payroll

The CIS (Construction Industry Scheme) module automatically calculates deductions based on contractor verification status:

- **Verified Gross**: 0% deduction
- **Verified Net**: 20% deduction
- **Not Verified**: 30% deduction

### Invoice Management

- Create sales and purchase invoices
- Automatic VAT calculation (20% standard rate)
- CIS deduction tracking
- Reverse charge VAT support
- Invoice status tracking (Draft, Sent, Paid, Overdue)

### Bank Reconciliation

- Import transactions (CSV support planned)
- Match transactions to invoices
- Track reconciliation status
- Categorize transactions

### Asset Reminders

Automatic reminders for:
- MOT due dates
- Road tax renewal
- Insurance renewal
- Service schedules

## Next Steps (Production Readiness)

### Database Setup

1. Choose a database provider (Neon recommended - see architectural plan)
2. Update `DATABASE_URL` in `.env.local`
3. Run migrations:
```bash
npx prisma migrate deploy
```

### Email Integration

- Set up email service (Resend, SendGrid, etc.)
- Configure for invoice sending
- Set up timesheet email webhook

### PDF Generation

- Implement PDF generation for invoices
- Use `react-pdf` or `jsPDF`

### Deployment

Recommended: **Vercel**

```bash
npm run build
vercel --prod
```

## Technologies Used

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **TailwindCSS 4** - Utility-first CSS
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **date-fns** - Date utilities
