import { z } from 'zod'
import type { ProductListParams } from '@/_data-access/product/get-products-paginated'

export type { ProductListParams }

export const DEFAULT_PRODUCT_PAGE_SIZE = 20
export const PRODUCT_PAGE_SIZE_OPTIONS = [20, 30, 40, 50] as const

export const productListParamsSchema = z.object({
  p_page: z.coerce.number().int().min(1).default(1),
  p_pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) => (PRODUCT_PAGE_SIZE_OPTIONS as readonly number[]).includes(value),
      { message: 'Invalid page size' },
    )
    .default(DEFAULT_PRODUCT_PAGE_SIZE),
  p_search: z.string().default(''),
  p_status: z.enum(['all', 'active', 'inactive']).default('all'),
})

export function parseProductListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ProductListParams {
  const normalized: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(searchParams)) {
    normalized[key] = Array.isArray(value) ? value[0] : value
  }

  const result = productListParamsSchema.safeParse(normalized)
  const parsed = result.success ? result.data : productListParamsSchema.parse({})

  return {
    page: parsed.p_page,
    pageSize: parsed.p_pageSize,
    search: parsed.p_search,
    status: parsed.p_status,
  }
}
