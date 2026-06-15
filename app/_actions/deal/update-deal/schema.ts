import { z } from 'zod'
import { DEAL_TITLE_MAX, DEAL_NOTES_MAX } from '@/_lib/constants/field-limits'

export const updateDealSchema = z.object({
  id: z.string().uuid('ID do deal inválido'),
  title: z
    .string()
    .min(1, 'Título é obrigatório')
    .max(DEAL_TITLE_MAX)
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().max(DEAL_NOTES_MAX).optional().nullable(),
  contactId: z.string().uuid('ID do contato inválido').optional().nullable(),
  companyId: z.string().uuid('ID da empresa inválido').optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: transferência de ownership
})

export type UpdateDealInput = z.infer<typeof updateDealSchema>
