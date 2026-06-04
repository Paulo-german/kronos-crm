import { z } from 'zod'
import type { PromotionListParams } from '@/_data-access/promotion/get-promotions-paginated'

export type { PromotionListParams }

export const DEFAULT_PROMOTION_PAGE_SIZE = 20
export const PROMOTION_PAGE_SIZE_OPTIONS = [20, 30, 40, 50] as const

export const promotionListParamsSchema = z.object({
  pr_page: z.coerce.number().int().min(1).default(1),
  pr_pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) => (PROMOTION_PAGE_SIZE_OPTIONS as readonly number[]).includes(value),
      { message: 'Invalid page size' },
    )
    .default(DEFAULT_PROMOTION_PAGE_SIZE),
  pr_search: z.string().default(''),
  pr_status: z.enum(['all', 'active', 'inactive']).default('all'),
})

export function parsePromotionListParams(
  searchParams: Record<string, string | string[] | undefined>,
): PromotionListParams {
  const normalized: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(searchParams)) {
    normalized[key] = Array.isArray(value) ? value[0] : value
  }

  const result = promotionListParamsSchema.safeParse(normalized)
  const parsed = result.success ? result.data : promotionListParamsSchema.parse({})

  return {
    page: parsed.pr_page,
    pageSize: parsed.pr_pageSize,
    search: parsed.pr_search,
    status: parsed.pr_status,
  }
}
