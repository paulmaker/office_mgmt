import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

// Register fonts if needed, otherwise use standard fonts
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 10,
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
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
  }
})

interface InvoicePDFProps {
  invoice: any // Using any for simplicity with complex Prisma types, ideally define strict interface
  entity: any
}

export const InvoicePDF = ({ invoice, entity }: InvoicePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={styles.column}>
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
          <Text style={styles.label}>Bill To:</Text>
          {invoice.client ? (
            <>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{invoice.client.companyName || invoice.client.name}</Text>
              <Text style={styles.value}>{invoice.client.address || 'No address provided'}</Text>
              <Text style={styles.value}>{invoice.client.email}</Text>
            </>
          ) : (
            <Text style={styles.value}>Client details unavailable</Text>
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

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colRate}>Rate</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        
        {invoice.lineItems.map((item: any, index: number) => {
          // Handle missing quantity/rate: default to 1 qty and derive rate from amount
          const quantity = item.quantity ?? 1
          const rate = item.rate ?? item.amount
          return (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{quantity}</Text>
              <Text style={styles.colRate}>{formatCurrency(rate)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          )
        })}
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
        </View>
        
        {invoice.vatAmount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT ({invoice.vatRate}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.vatAmount)}</Text>
          </View>
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
        <Text>Thank you for your business</Text>
        {invoice.notes && <Text style={{ marginTop: 5 }}>{invoice.notes}</Text>}
      </View>
    </Page>
  </Document>
)
