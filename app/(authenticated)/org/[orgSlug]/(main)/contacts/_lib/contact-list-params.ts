import { z } from 'zod'
import type {
  ContactListParams,
  ContactListResult,
} from '@/_data-access/contact/get-contacts'

// Re-exporta tipos do data-access para uso nos componentes de UI
export type { ContactListParams, ContactListResult }

export const CONTACT_SORT_OPTIONS = {
  recent: { label: 'Mais recentes', field: 'createdAt', direction: 'desc' },
  oldest: { label: 'Mais antigos', field: 'createdAt', direction: 'asc' },
  nameAsc: { label: 'Nome A-Z', field: 'name', direction: 'asc' },
  nameDesc: { label: 'Nome Z-A', field: 'name', direction: 'desc' },
} as const

export type ContactSortKey = keyof typeof CONTACT_SORT_OPTIONS

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [20, 30, 40, 50] as const

export const contactListParamsSchema = z.object({
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
    .enum(['recent', 'oldest', 'nameAsc', 'nameDesc'])
    .default('recent'),
  search: z.string().default(''),
  companyId: z.string().uuid().optional(),
  isDecisionMaker: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
  hasDeals: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
  assignedTo: z.string().uuid().optional(),
})

/**
 * Faz o parse seguro dos searchParams do server component, retornando defaults em caso de erro
 */
export function parseContactListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ContactListParams {
  // Normaliza valores de array para string (pega o primeiro valor)
  const normalized: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(searchParams)) {
    normalized[key] = Array.isArray(value) ? value[0] : value
  }

  const result = contactListParamsSchema.safeParse(normalized)
  if (result.success) return result.data

  // Fallback com defaults em caso de parse error
  return contactListParamsSchema.parse({})
}
