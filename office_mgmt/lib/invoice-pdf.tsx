import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

// Register fonts if needed, otherwise use standard fonts
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 120,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 10,
  },
  logo: {
    maxWidth: 160,
    maxHeight: 80,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  invoiceInfo: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoGroup: {
    flexDirection: 'column',
    maxWidth: '45%',
  },
  label: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    color: '#111827',
    marginBottom: 8,
  },
  table: {
    marginTop: 30,
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#F9FAFB',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    padding: 8,
  },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'right' },
  colRate: { width: '15%', textAlign: 'right' },
  colAmount: { width: '20%', textAlign: 'right' },
  /** Sales layout: Job # + description + qty + rate + amount */
  colJob: { width: '14%', paddingRight: 6 },
  colDescSales: { width: '36%' },
  colQtySales: { width: '12%', textAlign: 'right' },
  colRateSales: { width: '13%', textAlign: 'right' },
  colAmountSales: { width: '25%', textAlign: 'right' },
  jobReference: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    width: '100%',
  },
  
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '40%',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '40%',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 5,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
  },
  footerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerSection: {
    flexDirection: 'column',
    maxWidth: '48%',
  },
  footerLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  footerText: {
    fontSize: 7,
    color: '#4B5563',
    lineHeight: 1.4,
  },
  footerThankYou: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 8,
    marginTop: 8,
  }
})

interface InvoicePDFProps {
  invoice: any // Using any for simplicity with complex Prisma types, ideally define strict interface
  entity: any
  logoSrc?: string // Base64 data URI or presigned URL for the company logo
  invoicePaymentInfo?: string
  invoiceCompanyInfo?: string
}

export function InvoicePDF({
  invoice,
  entity,
  logoSrc,
  invoicePaymentInfo,
  invoiceCompanyInfo,
}: InvoicePDFProps) {
  const isSales = invoice.type === 'SALES'
  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : []

  return (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={styles.column}>
            {logoSrc && (
              // @ts-ignore - react-pdf Image src type
              <Image src={logoSrc} style={styles.logo} />
            )}
            <Text style={styles.title}>{entity.name}</Text>
            {entity.tenantAccount?.name && (
              <Text style={styles.subtitle}>{entity.tenantAccount.name}</Text>
            )}
          </View>
          <View style={styles.column}>
            <Text style={[styles.title, { fontSize: 20, textAlign: 'right' }]}>INVOICE</Text>
            <Text style={[styles.value, { textAlign: 'right' }]}>#{invoice.invoiceNumber}</Text>
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.invoiceInfo}>
        <View style={styles.infoGroup}>
          {invoice.client ? (
            <>
              <Text style={styles.label}>Bill To:</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{invoice.client.companyName || invoice.client.name}</Text>
              <Text style={styles.value}>{invoice.client.address || 'No address provided'}</Text>
              <Text style={styles.value}>{invoice.client.email}</Text>
            </>
          ) : invoice.supplier ? (
            <>
              <Text style={styles.label}>Supplier:</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{invoice.supplier.companyName || invoice.supplier.name}</Text>
              <Text style={styles.value}>{invoice.supplier.address || 'No address provided'}</Text>
            </>
          ) : invoice.subcontractor ? (
            <>
              <Text style={styles.label}>Subcontractor:</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{invoice.subcontractor.name}</Text>
              <Text style={styles.value}>{invoice.subcontractor.address || 'No address provided'}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Bill To:</Text>
              <Text style={styles.value}>Details unavailable</Text>
            </>
          )}
        </View>
        <View style={[styles.infoGroup, { alignItems: 'flex-end' }]}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{format(new Date(invoice.date), 'dd MMM yyyy')}</Text>
          
          <Text style={styles.label}>Due Date:</Text>
          <Text style={styles.value}>{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</Text>
          
          {invoice.client?.vatNumber && (
            <>
              <Text style={styles.label}>Client VAT:</Text>
              <Text style={styles.value}>{invoice.client.vatNumber}</Text>
            </>
          )}
        </View>
      </View>

      {isSales && invoice.job && (
        <View style={styles.jobReference}>
          <Text style={styles.label}>Linked job</Text>
          <Text style={styles.value}>
            {invoice.job.jobNumber}
            {invoice.job.jobDescription ? ` — ${invoice.job.jobDescription}` : ''}
          </Text>
        </View>
      )}

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {isSales ? (
            <>
              <Text style={styles.colJob}>Job #</Text>
              <Text style={styles.colDescSales}>Description</Text>
              <Text style={styles.colQtySales}>Qty</Text>
              <Text style={styles.colRateSales}>Rate</Text>
              <Text style={styles.colAmountSales}>Amount</Text>
            </>
          ) : (
            <>
              <Text style={styles.colDesc}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colRate}>Rate</Text>
              <Text style={styles.colAmount}>Amount</Text>
            </>
          )}
        </View>

        {lineItems.map((item: unknown, index: number) => {
          const it = item as {
            description?: string
            quantity?: number
            rate?: number
            amount?: number
            jobNumber?: string
          }
          const quantity = it.quantity ?? 1
          const rate = it.rate ?? it.amount ?? 0
          const desc = it.description?.trim() ? it.description : '—'
          const amount = typeof it.amount === 'number' ? it.amount : 0
          const jobCell =
            it.jobNumber && String(it.jobNumber).trim() ? String(it.jobNumber).trim() : '—'
          return (
            <View key={index} style={styles.tableRow}>
              {isSales ? (
                <>
                  <Text style={styles.colJob}>{jobCell}</Text>
                  <Text style={styles.colDescSales}>{desc}</Text>
                  <Text style={styles.colQtySales}>{quantity}</Text>
                  <Text style={styles.colRateSales}>{formatCurrency(rate)}</Text>
                  <Text style={styles.colAmountSales}>{formatCurrency(amount)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.colDesc}>{desc}</Text>
                  <Text style={styles.colQty}>{quantity}</Text>
                  <Text style={styles.colRate}>{formatCurrency(rate)}</Text>
                  <Text style={styles.colAmount}>{formatCurrency(amount)}</Text>
                </>
              )}
            </View>
          )
        })}
      </View>

      {/* Totals */}
      <View style={styles.totals} wrap={false}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
        </View>
        
        {invoice.reverseCharge ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              VAT ({invoice.vatRate ?? 0}%) — Reverse charge
            </Text>
            <Text style={styles.totalValue}>{formatCurrency((invoice.subtotal || 0) * ((invoice.vatRate || 0) / 100))}</Text>
          </View>
        ) : (
          invoice.vatAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT ({invoice.vatRate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.vatAmount)}</Text>
            </View>
          )
        )}

        {invoice.cisDeduction > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>CIS Deduction</Text>
            <Text style={styles.totalValue}>-{formatCurrency(invoice.cisDeduction)}</Text>
          </View>
        )}

        <View style={styles.grandTotal}>
          <Text style={styles.grandTotalLabel}>Total Due</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {(invoicePaymentInfo || invoiceCompanyInfo) && (
          <View style={styles.footerColumns}>
            {invoicePaymentInfo && (
              <View style={styles.footerSection}>
                <Text style={styles.footerLabel}>Payment Information</Text>
                {invoicePaymentInfo.split('\n').map((line, i) => (
                  <Text key={i} style={styles.footerText}>{line}</Text>
                ))}
              </View>
            )}
            {invoiceCompanyInfo && (
              <View style={styles.footerSection}>
                <Text style={styles.footerLabel}>Company Information</Text>
                {invoiceCompanyInfo.split('\n').map((line, i) => (
                  <Text key={i} style={styles.footerText}>{line}</Text>
                ))}
              </View>
            )}
          </View>
        )}
        <Text style={styles.footerThankYou}>Thank you for your business</Text>
        {invoice.notes && <Text style={[styles.footerThankYou, { marginTop: 2 }]}>{invoice.notes}</Text>}
      </View>
    </Page>
  </Document>
  )
}
