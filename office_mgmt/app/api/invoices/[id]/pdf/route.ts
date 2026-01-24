import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import { InvoicePDF } from "@/lib/invoice-pdf"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.entityId) {
      return new NextResponse("Unauthorized", { status: 401 })
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

    if (!invoice || invoice.entityId !== session.user.entityId) {
      return new NextResponse("Not found", { status: 404 })
    }

    const stream = await renderToStream(
      <InvoicePDF invoice={invoice} entity={invoice.entity} />
    )

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF Generation Error:', error)
    return new NextResponse("Error generating PDF", { status: 500 })
  }
}
