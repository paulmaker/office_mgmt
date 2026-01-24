'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { resend, EMAIL_FROM } from "@/lib/email"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoicePDF } from "@/lib/invoice-pdf"
import { formatCurrency } from "@/lib/utils"

export async function sendInvoiceEmail(invoiceId: string) {
  try {
    const session = await auth()
    if (!session?.user?.entityId) {
      throw new Error("Unauthorized")
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        entity: {
          include: {
            tenantAccount: true
          }
        }
      }
    })

    if (!invoice || invoice.entityId !== session.user.entityId) {
      throw new Error("Invoice not found")
    }

    if (!invoice.client?.email) {
      throw new Error("Client has no email address")
    }

    // Generate PDF Buffer
    // Note: renderToBuffer returns a Buffer, which Resend accepts
    const pdfBuffer = await renderToBuffer(
      // @ts-ignore - InvoicePDF props are loose for now
      <InvoicePDF invoice={invoice} entity={invoice.entity} />
    )

    // Send Email
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: invoice.client.email,
      subject: `Invoice #${invoice.invoiceNumber} from ${invoice.entity.name}`,
      html: `
        <p>Dear ${invoice.client.name},</p>
        <p>Please find attached invoice <strong>#${invoice.invoiceNumber}</strong> for <strong>${formatCurrency(invoice.total)}</strong>.</p>
        <p>Due date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        <p>Thank you for your business.</p>
        <p>Best regards,<br>${invoice.entity.name}</p>
      `,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    if (error) {
      console.error("Resend Error:", error)
      throw new Error(error.message)
    }

    // Update status to SENT if it was DRAFT
    if (invoice.status === 'DRAFT') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'SENT' }
      })
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error("Send Invoice Error:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to send email")
  }
}
