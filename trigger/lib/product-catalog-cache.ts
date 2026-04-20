import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import type { ProductCatalogItem } from '../agent/single-guard'

const CATALOG_TTL_SECONDS = 60
const cacheKey = (orgId: string) => `guard:catalog:${orgId}`

/**
 * Retorna o catálogo de produtos ativos da org para uso no guard de preço.
 * Cache Redis de 60s para balancear freshness e economia de query.
 * `priceVariants` não existe no schema atual — retornado como array vazio.
 */
export async function getProductCatalogForGuard(
  organizationId: string,
): Promise<ProductCatalogItem[]> {
  const key = cacheKey(organizationId)

  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as ProductCatalogItem[]
  }

  const products = await db.product.findMany({
    where: { organizationId, isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
    },
  })

  const catalog: ProductCatalogItem[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    // Decimal.toString() preserva precisão fiscal sem float drift
    price: product.price.toString(),
    currency: 'BRL',
    // Campo priceVariants não existe no schema Product atual — placeholder para compat futura
    priceVariants: [],
  }))

  await redis.set(key, JSON.stringify(catalog), 'EX', CATALOG_TTL_SECONDS)

  return catalog
}
