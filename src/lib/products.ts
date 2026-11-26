import 'server-only'

import { getPayloadClient } from '@/lib/payload'
import type { ProductView } from '@/components/BakeryApp'

export async function getProducts(): Promise<ProductView[]> {
  const payload = await getPayloadClient()
  let result
  try {
    result = await payload.find({
      collection: 'products',
      overrideAccess: false,
      where: { available: { equals: true } },
      sort: 'sortOrder',
      limit: 100,
      depth: 1,
    })
  } catch {
    // A long-running dev Admin instance can briefly lag behind a newly added schema.
    // Production initializes with the complete config; the menu keeps a useful empty state meanwhile.
    return []
  }

  return result.docs.map((doc) => {
    const image = typeof doc.image === 'object' && doc.image
      ? { url: doc.image.url || '', alt: doc.image.alt, width: doc.image.width, height: doc.image.height }
      : null
    return {
      id: String(doc.id),
      name: doc.name,
      description: doc.description,
      price: doc.price,
      category: doc.category,
      image: image?.url ? image : null,
    }
  })
}
