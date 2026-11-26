import BakeryApp from '@/components/BakeryApp'
import { getProducts } from '@/lib/products'

export const dynamic = 'force-static'

export default async function OrderOnlinePage() {
  const products = await getProducts()
  return <BakeryApp screen="menu" products={products} />
}
