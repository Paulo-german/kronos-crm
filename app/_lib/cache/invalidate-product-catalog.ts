import { redis } from '@/_lib/redis'

/**
 * Apaga o cache Redis do catálogo de produtos usado pelo guard de preço.
 * Non-fatal: falha silenciosa com warn — TTL de 60s é curto o suficiente
 * para não causar divergência grave caso o del não execute.
 */
export async function invalidateProductCatalogCache(organizationId: string): Promise<void> {
  try {
    await redis.del(`guard:catalog:${organizationId}`)
  } catch (error) {
    console.warn('[cache] Failed to invalidate product catalog cache', { organizationId, error })
  }
}
