// Mock data for development
export const mockClients = [
  {
    id: '1',
    name: 'John Smith',
    companyName: 'Smith Construction Ltd',
    email: 'john@smithconstruction.co.uk',
    phone: '07700 900123',
    address: '123 High Street, London, SW1A 1AA',
    billingAddress: '123 High Street, London, SW1A 1AA',
    vatNumber: 'GB123456789',
    vatRegistered: true,
    cisRegistered: false,
    paymentTerms: 30,
    ratesConfig: { hourlyRate: 45, standardJobRate: 350 },
    notes: 'Preferred client - always pays on time',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    companyName: 'Johnson Builders',
    email: 'sarah@johnsonbuilders.co.uk',
    phone: '07700 900456',
    address: '45 Park Lane, Manchester, M1 2AB',
    billingAddress: '45 Park Lane, Manchester, M1 2AB',
    vatNumber: 'GB987654321',
    vatRegistered: true,
    cisRegistered: true,
    paymentTerms: 14,
    ratesConfig: { hourlyRate: 50, standardJobRate: 400 },
    notes: 'CIS registered client',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '3',
    name: 'David Brown',
    companyName: 'Brown Property Services',
    email: 'david@brownproperty.co.uk',
    phone: '07700 900789',
    address: '78 Queen Street, Birmingham, B1 3CD',
    billingAddress: '78 Queen Street, Birmingham, B1 3CD',
    vatNumber: null,
    vatRegistered: false,
    cisRegistered: false,
    paymentTerms: 30,
    ratesConfig: { hourlyRate: 40, standardJobRate: 300 },
    notes: 'Small jobs only',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
  },
]

export const mockSubcontractors = [
  {
    id: '1',
    name: 'Mike Wilson',
    email: 'mike.wilson@email.co.uk',
    phone: '07700 900321',
    address: '12 Oak Avenue, Leeds, LS1 4EF',
    niNumber: 'AB123456C',
    utr: '1234567890',
    cisVerificationNumber: 'CIS123456',
    cisStatus: 'VERIFIED_NET',
    paymentType: 'CIS',
    bankDetails: { sortCode: '12-34-56', accountNumber: '12345678' },
    notes: 'Experienced plasterer',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    name: 'Tom Harris',
    email: 'tom.harris@email.co.uk',
    phone: '07700 900654',
    address: '56 Elm Road, Liverpool, L1 5GH',
    niNumber: 'CD789012D',
    utr: '0987654321',
    cisVerificationNumber: null,
    cisStatus: 'NOT_VERIFIED',
    paymentType: 'CIS',
    bankDetails: { sortCode: '65-43-21', accountNumber: '87654321' },
    notes: 'Electrician - not yet verified',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: '3',
    name: 'James Taylor',
    email: 'james.taylor@email.co.uk',
    phone: '07700 900987',
    address: '89 Maple Close, Bristol, BS1 6IJ',
    niNumber: 'EF345678E',
    utr: '5678901234',
    cisVerificationNumber: 'CIS789012',
    cisStatus: 'VERIFIED_GROSS',
    paymentType: 'CIS',
    bankDetails: { sortCode: '11-22-33', accountNumber: '11223344' },
    notes: 'Plumber - gross payment',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
]

export const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-2401-0001',
    type: 'SALES',
    clientId: '1',
    subcontractorId: null,
    date: new Date('2024-01-15'),
    dueDate: new Date('2024-02-14'),
    subtotal: 2500.00,
    vatAmount: 500.00,
    vatRate: 20,
    cisDeduction: 0,
    cisRate: 0,
    reverseCharge: false,
    total: 3000.00,
    status: 'PAID',
    paymentDate: new Date('2024-02-10'),
    paymentMethod: 'Bank Transfer',
    lineItems: [
      { description: 'Plastering - Main Bedroom', quantity: 1, rate: 800, amount: 800 },
      { description: 'Plastering - Living Room', quantity: 1, rate: 1200, amount: 1200 },
      { description: 'Materials', quantity: 1, rate: 500, amount: 500 },
    ],
    notes: 'Thank you for your business',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: '2',
    invoiceNumber: 'INV-2402-0002',
    type: 'SALES',
    clientId: '2',
    subcontractorId: null,
    date: new Date('2024-02-20'),
    dueDate: new Date('2024-03-05'),
    subtotal: 4000.00,
    vatAmount: 800.00,
    vatRate: 20,
    cisDeduction: 0,
    cisRate: 0,
    reverseCharge: false,
    total: 4800.00,
    status: 'SENT',
    paymentDate: null,
    paymentMethod: null,
    lineItems: [
      { description: 'Complete bathroom renovation', quantity: 1, rate: 3500, amount: 3500 },
      { description: 'Additional fixtures', quantity: 1, rate: 500, amount: 500 },
    ],
    notes: 'Payment due within 14 days',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: '3',
    invoiceNumber: 'PO-2401-0001',
    type: 'PURCHASE',
    clientId: null,
    subcontractorId: '1',
    date: new Date('2024-01-25'),
    dueDate: new Date('2024-02-08'),
    subtotal: 1500.00,
    vatAmount: 0,
    vatRate: 0,
    cisDeduction: 300.00,
    cisRate: 20,
    reverseCharge: false,
    total: 1200.00,
    status: 'PAID',
    paymentDate: new Date('2024-02-05'),
    paymentMethod: 'BACS',
    lineItems: [
      { description: 'Labour - Week 1', quantity: 40, rate: 37.50, amount: 1500 },
    ],
    notes: 'CIS deduction applied',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-02-05'),
  },
  {
    id: '4',
    invoiceNumber: 'INV-2403-0003',
    type: 'SALES',
    clientId: '1',
    subcontractorId: null,
    date: new Date('2024-03-01'),
    dueDate: new Date('2024-03-15'),
    subtotal: 1800.00,
    vatAmount: 360.00,
    vatRate: 20,
    cisDeduction: 0,
    cisRate: 0,
    reverseCharge: false,
    total: 2160.00,
    status: 'OVERDUE',
    paymentDate: null,
    paymentMethod: null,
    lineItems: [
      { description: 'Kitchen tiling', quantity: 1, rate: 1800, amount: 1800 },
    ],
    notes: 'Payment overdue - please remit',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
]

export const mockTimesheets = [
  {
    id: '1',
    subcontractorId: '1',
    periodStart: new Date('2024-01-22'),
    periodEnd: new Date('2024-01-26'),
    hoursWorked: 40,
    rate: 37.50,
    grossAmount: 1500.00,
    cisDeduction: 300.00,
    netAmount: 1200.00,
    status: 'PAID',
    submittedVia: 'EMAIL',
    approvedBy: 'Admin',
    approvedAt: new Date('2024-01-27'),
    processedAt: new Date('2024-01-28'),
    paidAt: new Date('2024-02-05'),
    notes: 'Week 4 - January',
    createdAt: new Date('2024-01-26'),
    updatedAt: new Date('2024-02-05'),
  },
  {
    id: '2',
    subcontractorId: '2',
    periodStart: new Date('2024-02-12'),
    periodEnd: new Date('2024-02-16'),
    hoursWorked: 35,
    rate: 42.00,
    grossAmount: 1470.00,
    cisDeduction: 441.00,
    netAmount: 1029.00,
    status: 'APPROVED',
    submittedVia: 'EMAIL',
    approvedBy: 'Admin',
    approvedAt: new Date('2024-02-17'),
    processedAt: null,
    paidAt: null,
    notes: 'Week 7 - February',
    createdAt: new Date('2024-02-16'),
    updatedAt: new Date('2024-02-17'),
  },
  {
    id: '3',
    subcontractorId: '3',
    periodStart: new Date('2024-03-04'),
    periodEnd: new Date('2024-03-08'),
    hoursWorked: 40,
    rate: 45.00,
    grossAmount: 1800.00,
    cisDeduction: 0,
    netAmount: 1800.00,
    status: 'SUBMITTED',
    submittedVia: 'MANUAL',
    approvedBy: null,
    approvedAt: null,
    processedAt: null,
    paidAt: null,
    notes: 'Week 10 - March - Gross payment contractor',
    createdAt: new Date('2024-03-08'),
    updatedAt: new Date('2024-03-08'),
  },
]

export const mockBankTransactions = [
  {
    id: '1',
    date: new Date('2024-02-10'),
    description: 'Smith Construction Ltd - Invoice INV-2401-0001',
    amount: 3000.00,
    type: 'CREDIT',
    category: 'Sales Invoice Payment',
    reconciled: true,
    invoiceId: '1',
    notes: 'Matched to invoice',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: '2',
    date: new Date('2024-02-05'),
    description: 'Payment to Mike Wilson - CIS',
    amount: -1200.00,
    type: 'DEBIT',
    category: 'Subcontractor Payment',
    reconciled: true,
    invoiceId: '3',
    notes: 'CIS payment made',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
  },
  {
    id: '3',
    date: new Date('2024-03-01'),
    description: 'Office supplies - Staples',
    amount: -145.50,
    type: 'DEBIT',
    category: 'Office Expenses',
    reconciled: false,
    invoiceId: null,
    notes: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: '4',
    date: new Date('2024-03-05'),
    description: 'Fuel - BP Station',
    amount: -87.20,
    type: 'DEBIT',
    category: 'Vehicle Expenses',
    reconciled: false,
    invoiceId: null,
    notes: null,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
]

export const mockAssets = [
  {
    id: '1',
    type: 'VEHICLE',
    name: 'Ford Transit Van',
    registrationNumber: 'AB12 CDE',
    motDueDate: new Date('2024-08-15'),
    taxDueDate: new Date('2024-06-30'),
    insuranceDueDate: new Date('2024-05-10'),
    serviceDueDate: new Date('2024-07-01'),
    remindersEnabled: true,
    notes: 'Company van - primary vehicle',
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01'),
  },
  {
    id: '2',
    type: 'VEHICLE',
    name: 'Volkswagen Caddy',
    registrationNumber: 'FG34 HIJ',
    motDueDate: new Date('2024-11-20'),
    taxDueDate: new Date('2024-09-15'),
    insuranceDueDate: new Date('2024-07-22'),
    serviceDueDate: new Date('2024-08-10'),
    remindersEnabled: true,
    notes: 'Backup vehicle',
    createdAt: new Date('2023-08-15'),
    updatedAt: new Date('2023-08-15'),
  },
  {
    id: '3',
    type: 'EQUIPMENT',
    name: 'Scaffolding Tower',
    registrationNumber: null,
    motDueDate: null,
    taxDueDate: null,
    insuranceDueDate: new Date('2024-12-31'),
    serviceDueDate: new Date('2024-10-01'),
    remindersEnabled: true,
    notes: 'Annual safety inspection required',
    createdAt: new Date('2022-01-10'),
    updatedAt: new Date('2022-01-10'),
  },
]

export const mockQuickLinks = [
  {
    id: '1',
    name: 'Barclays Business Banking',
    url: 'https://bank.barclays.co.uk',
    category: 'Banking',
    displayOrder: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Dartford Tunnel',
    url: 'https://www.gov.uk/pay-dartford-crossing-charge',
    category: 'Services',
    displayOrder: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'Dulux Trade',
    url: 'https://www.duluxtradepaintexpert.co.uk',
    category: 'Suppliers',
    displayOrder: 3,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    name: 'HMRC CIS Online',
    url: 'https://www.tax.service.gov.uk/cis',
    category: 'Tax',
    displayOrder: 4,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '5',
    name: 'HMRC VAT',
    url: 'https://www.tax.service.gov.uk/vat-through-software/sign-in',
    category: 'Tax',
    displayOrder: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

// Calculate dashboard statistics from mock data
export function getDashboardStats() {
  const totalRevenue = mockInvoices
    .filter(inv => inv.type === 'SALES' && inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.total, 0)

  const totalExpenses = mockInvoices
    .filter(inv => inv.type === 'PURCHASE' && inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.total, 0)

  const outstandingInvoices = mockInvoices
    .filter(inv => inv.type === 'SALES' && inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.total, 0)

  const overdueInvoices = mockInvoices
    .filter(inv => inv.type === 'SALES' && inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.total, 0)

  const pendingTimesheets = mockTimesheets
    .filter(ts => ts.status === 'SUBMITTED')
    .length

  const totalVATCollected = mockInvoices
    .filter(inv => inv.type === 'SALES' && inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.vatAmount, 0)

  const totalCISDeductions = mockTimesheets
    .filter(ts => ts.status === 'PAID')
    .reduce((sum, ts) => sum + ts.cisDeduction, 0)

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    outstandingInvoices,
    overdueInvoices,
    pendingTimesheets,
    totalVATCollected,
    totalCISDeductions,
  }
}

// Get recent activity
export function getRecentActivity() {
  const activities: Array<{
    id: string
    type: string
    description: string
    date: Date
    amount?: number
  }> = []

  // Add invoice activities
  mockInvoices.slice(0, 5).forEach(inv => {
    activities.push({
      id: inv.id,
      type: inv.type === 'SALES' ? 'invoice_sent' : 'purchase_invoice',
      description: `${inv.type === 'SALES' ? 'Sales' : 'Purchase'} Invoice ${inv.invoiceNumber} - ${inv.status}`,
      date: inv.updatedAt,
      amount: inv.total,
    })
  })

  // Add timesheet activities
  mockTimesheets.slice(0, 3).forEach(ts => {
    const subcontractor = mockSubcontractors.find(s => s.id === ts.subcontractorId)
    activities.push({
      id: ts.id,
      type: 'timesheet',
      description: `Timesheet ${ts.status} - ${subcontractor?.name}`,
      date: ts.updatedAt,
      amount: ts.netAmount,
    })
  })

  // Sort by date descending
  return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10)
}
