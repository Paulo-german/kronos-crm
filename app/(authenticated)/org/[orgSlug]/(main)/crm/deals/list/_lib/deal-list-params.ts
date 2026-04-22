import { z } from 'zod'
import type { DealStatus, DealPriority } from '@prisma/client'
import type { DealListParams, DealListResult } from '@/_data-access/deal/get-deals'

// Re-exporta tipos do data-access para uso nos componentes de UI
export type { DealListParams, DealListResult }

export const DEAL_SORT_OPTIONS = {
  'created-desc': { label: 'Mais recentes', field: 'createdAt', direction: 'desc' },
  'created-asc': { label: 'Mais antigos', field: 'createdAt', direction: 'asc' },
  'value-desc': { label: 'Maior valor', field: 'value', direction: 'desc' },
  'value-asc': { label: 'Menor valor', field: 'value', direction: 'asc' },
  'priority-desc': { label: 'Maior prioridade', field: 'priority', direction: 'desc' },
  'title-asc': { label: 'Título A-Z', field: 'title', direction: 'asc' },
} as const

export type DealSortKey = keyof typeof DEAL_SORT_OPTIONS

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [20, 30, 40, 50] as const

export const dealListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) => (PAGE_SIZE_OPTIONS as readonly number[]).includes(value),
      { message: 'Invalid page size' },
    )
    .default(DEFAULT_PAGE_SIZE),
  sort: z
    .enum(['created-desc', 'created-asc', 'value-desc', 'value-asc', 'priority-desc', 'title-asc'])
    .default('created-desc'),
  search: z.string().default(''),
  // Comma-separated no param da URL: "OPEN,IN_PROGRESS" — o data-access faz .split(',')
  status: z.string().default(''),
  priority: z.string().default(''),
  assignedTo: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  valueMin: z.coerce.number().optional(),
  valueMax: z.coerce.number().optional(),
  pipelineId: z.string().uuid().optional(),
})

/**
 * Faz o parse seguro dos searchParams do server component, retornando defaults em caso de erro.
 * Segue o padrão exato de parseContactListParams.
 */
export function parseDealListParams(
  searchParams: Record<string, string | string[] | undefined>,
): DealListParams {
  // Normaliza valores de array para string (pega o primeiro valor)
  const normalized: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(searchParams)) {
    normalized[key] = Array.isArray(value) ? value[0] : value
  }

  const result = dealListParamsSchema.safeParse(normalized)
  if (result.success) {
    return mapSchemaToParams(result.data)
  }

  // Fallback com defaults em caso de parse error
  return mapSchemaToParams(dealListParamsSchema.parse({}))
}

// Converte o schema (com status/priority como string CSV) para DealListParams tipado
function mapSchemaToParams(
  parsed: z.infer<typeof dealListParamsSchema>,
): DealListParams {
  return {
    page: parsed.page,
    pageSize: parsed.pageSize,
    sort: parsed.sort,
    search: parsed.search,
    // Cast seguro: valores originam de nuqs parseAsArrayOf com enum DealStatus/DealPriority
    status: (parsed.status ? parsed.status.split(',').filter(Boolean) : []) as DealStatus[],
    priority: (parsed.priority ? parsed.priority.split(',').filter(Boolean) : []) as DealPriority[],
    assignedTo: parsed.assignedTo,
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    valueMin: parsed.valueMin,
    valueMax: parsed.valueMax,
    pipelineId: parsed.pipelineId,
  }
}
