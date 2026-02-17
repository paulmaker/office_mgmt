import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import { InvoicePDF } from "@/lib/invoice-pdf"
import { requireSessionEntityId } from "@/lib/session-entity"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    let entityId: string
    try {
      entityId = requireSessionEntityId(session)
    } catch {
      return new NextResponse("No entity selected", { status: 403 })
    }

    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        entity: {
          include: {
            tenantAccount: true
          }
        }
      }
    })

    if (!invoice || invoice.entityId !== entityId) {
      return new NextResponse("Not found", { status: 404 })
    }

    const entitySettings = invoice.entity.settings as Record<string, unknown> | null
    const logoSrc = (entitySettings?.logoDataUri as string) || undefined
    const invoicePaymentInfo = (entitySettings?.invoicePaymentInfo as string) || undefined
    const invoiceCompanyInfo = (entitySettings?.invoiceCompanyInfo as string) || undefined

    const stream = await renderToStream(
      // @ts-ignore
      <InvoicePDF
        invoice={invoice}
        entity={invoice.entity}
        logoSrc={logoSrc}
        invoicePaymentInfo={invoicePaymentInfo}
        invoiceCompanyInfo={invoiceCompanyInfo}
      />
    )

    const url = new URL(request.url)
    const isPreview = url.searchParams.get("preview") === "1"
    const contentDisposition = isPreview
      ? `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`
      : `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
      },
    })
  } catch (error) {
    console.error('PDF Generation Error:', error)
    return new NextResponse("Error generating PDF", { status: 500 })
  }
}
