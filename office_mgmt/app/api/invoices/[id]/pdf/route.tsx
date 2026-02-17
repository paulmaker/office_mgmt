import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import { InvoicePDF } from "@/lib/invoice-pdf"
import { requireSessionEntityId } from "@/lib/session-entity"
import { getObjectBuffer } from "@/lib/s3"

/**
 * Build a base64 data URI from an S3-stored logo.
 * Returns undefined if no logo key is configured or the fetch fails.
 */
async function getLogoDataUri(settings: Record<string, unknown> | null): Promise<string | undefined> {
  const logoKey = (settings as Record<string, unknown> | null)?.logoS3Key as string | undefined
  if (!logoKey) return undefined

  try {
    const buffer = await getObjectBuffer(logoKey)
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch (error) {
    console.error('Failed to fetch logo from S3:', error)
    return undefined
  }
}

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

    const logoSrc = await getLogoDataUri(invoice.entity.settings as Record<string, unknown> | null)

    const stream = await renderToStream(
      // @ts-ignore
      <InvoicePDF invoice={invoice} entity={invoice.entity} logoSrc={logoSrc} />
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
