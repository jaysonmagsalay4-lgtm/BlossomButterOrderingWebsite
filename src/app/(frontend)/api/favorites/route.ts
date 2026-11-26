import { appAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET() {
  const user = await appAuth.currentUser()
  if (!user) return Response.json({ error: 'Sign in to sync favorites.' }, { status: 401 })

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'shopping-lists',
    overrideAccess: false,
    user,
    depth: 0,
    limit: 1,
    where: { owner: { equals: user.id } },
  })
  const products = result.docs[0]?.products ?? []
  return Response.json({
    productIds: products.map((product) => typeof product === 'object' ? String(product.id) : String(product)),
  })
}

export async function PUT(request: Request) {
  const user = await appAuth.currentUser()
  if (!user) return Response.json({ error: 'Sign in to sync favorites.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.productIds) || body.productIds.length > 100 || body.productIds.some((id: unknown) => typeof id !== 'string')) {
    return Response.json({ error: 'Invalid favorites list.' }, { status: 400 })
  }
  const productIds = [...new Set<string>(body.productIds)]
  const payload = await getPayloadClient()
  const existing = await payload.find({
    collection: 'shopping-lists',
    overrideAccess: false,
    user,
    depth: 0,
    limit: 1,
    where: { owner: { equals: user.id } },
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'shopping-lists',
      id: existing.docs[0].id,
      overrideAccess: false,
      user,
      data: { products: productIds },
    })
  } else {
    await payload.create({
      collection: 'shopping-lists',
      overrideAccess: false,
      user,
      data: { name: 'My favorites', owner: user.id, products: productIds },
    })
  }
  return Response.json({ success: true, productIds })
}
