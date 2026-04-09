import { NextResponse } from 'next/server'
import { getInvoiceForSession } from '@/lib/get-invoice-for-session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const invoice = await getInvoiceForSession(id)
    return NextResponse.json(invoice)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    if (message === 'Invoice not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (
      message.includes('permission') ||
      message.includes('do not have permission to access')
    ) {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    console.error('[GET /api/invoices/[id]]', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
