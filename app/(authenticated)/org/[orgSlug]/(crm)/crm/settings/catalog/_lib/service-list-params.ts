import { z } from 'zod'
import type { ServiceListParams, ServiceListResult } from '@/_data-access/service/get-services-paginated'

// Re-exporta tipos do data-access para uso nos componentes de UI
export type { ServiceListParams, ServiceListResult }

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [20, 30, 40, 50] as const

export const serviceListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) => (PAGE_SIZE_OPTIONS as readonly number[]).includes(value),
      { message: 'Invalid page size' },
    )
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().default(''),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
})

/**
 * Faz o parse seguro dos searchParams do server component, retornando defaults em caso de erro
 */
export function parseServiceListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ServiceListParams {
  // Normaliza valores de array para string (pega o primeiro valor)
  const normalized: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(searchParams)) {
    normalized[key] = Array.isArray(value) ? value[0] : value
  }

  const result = serviceListParamsSchema.safeParse(normalized)
  if (result.success) return result.data

  // Fallback com defaults em caso de parse error
  return serviceListParamsSchema.parse({})
}
