import config from '@payload-config'
import { appAuth } from '@/lib/app-auth'
import { getPayload } from 'payload'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const items = Array.isArray(body?.items) ? body.items : []
  const pickupDate = typeof body?.pickupDate === 'string' ? new Date(body.pickupDate) : null

  if (
    typeof body?.customerName !== 'string' ||
    body.customerName.trim().length < 2 ||
    typeof body?.email !== 'string' ||
    !emailPattern.test(body.email) ||
    typeof body?.phone !== 'string' ||
    body.phone.replace(/\D/g, '').length < 10 ||
    !pickupDate ||
    Number.isNaN(pickupDate.getTime()) ||
    pickupDate.getTime() < Date.now() - 60_000 ||
    typeof body?.pickupWindow !== 'string' ||
    !['8:00–9:00 AM', '9:00–10:00 AM', '10:00–11:00 AM', '11:00 AM–12:00 PM', '12:00–1:00 PM', '1:00–2:00 PM', '2:00–3:00 PM', '3:00–4:00 PM'].includes(body.pickupWindow) ||
    !/^\d{4}$/.test(body?.paymentLast4 || '') ||
    items.length < 1 ||
    items.length > 24
  ) {
    return Response.json({ error: 'Please check the order details and try again.' }, { status: 400 })
  }

  const cleanItems = items.map((item: Record<string, unknown>) => ({
    product: String(item.product || ''),
    name: String(item.name || '').slice(0, 120),
    quantity: Math.max(1, Math.min(24, Number(item.quantity) || 1)),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
  }))
  if (cleanItems.some((item: { product: string; name: string }) => !item.product || !item.name)) {
    return Response.json({ error: 'One or more treats are unavailable.' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config: await config, key: 'blossom-butter-app' })
    const user = await appAuth.currentUser()
    const order = await payload.create({
      collection: 'orders',
      overrideAccess: false,
      user: user ?? undefined,
      data: {
        customer: user?.id,
        customerName: body.customerName.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        pickupDate: pickupDate.toISOString(),
        pickupWindow: body.pickupWindow,
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : undefined,
        items: cleanItems,
        paymentLast4: body.paymentLast4,
      },
    })
    return Response.json({
      order: {
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
      },
    })
  } catch {
    return Response.json({ error: 'We could not place the order. Please try again.' }, { status: 500 })
  }
}
