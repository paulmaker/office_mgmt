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

export async function sendTimesheetEmail(timesheetId: string) {
  try {
    const session = await auth()
    if (!session?.user?.entityId) {
      throw new Error("Unauthorized")
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        subcontractor: true,
        entity: true,
      },
    })

    if (!timesheet || timesheet.entityId !== session.user.entityId) {
      throw new Error("Timesheet not found")
    }

    if (!timesheet.subcontractor?.email) {
      throw new Error("Subcontractor has no email address")
    }

    const rateType = (timesheet as { rateType?: string }).rateType ?? "HOURLY"
    const daysWorked = (timesheet as { daysWorked?: number | null }).daysWorked
    const periodStart = new Date(timesheet.periodStart).toLocaleDateString()
    const periodEnd = new Date(timesheet.periodEnd).toLocaleDateString()
    const quantityLabel =
      rateType === "DAILY" && daysWorked != null
        ? `${daysWorked} days`
        : `${timesheet.hoursWorked} hours`
    const rateLabel = rateType === "DAILY" ? "£/day" : "£/hr"

    const html = `
      <p>Dear ${timesheet.subcontractor.name},</p>
      <p>Please find below a summary of your timesheet for the period <strong>${periodStart}</strong> to <strong>${periodEnd}</strong>.</p>
      <ul>
        <li>Quantity: ${quantityLabel}</li>
        <li>Rate: ${formatCurrency(timesheet.rate)} ${rateLabel}</li>
        <li>Gross amount: ${formatCurrency(timesheet.grossAmount)}</li>
        <li>CIS deduction: ${formatCurrency(timesheet.cisDeduction)}</li>
        <li>Expenses: ${formatCurrency(timesheet.expenses ?? 0)}</li>
        <li>Net amount: ${formatCurrency(timesheet.netAmount)}</li>
        <li>Status: ${timesheet.status}</li>
      </ul>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br>${timesheet.entity.name}</p>
    `

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: timesheet.subcontractor.email,
      subject: `Timesheet ${periodStart} – ${periodEnd} – ${timesheet.entity.name}`,
      html,
    })

    if (error) {
      console.error("Resend Error:", error)
      throw new Error(error.message)
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error("Send Timesheet Email Error:", error)
    throw new Error(
      error instanceof Error ? error.message : "Failed to send email"
    )
  }
}
