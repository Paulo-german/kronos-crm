import { z } from 'zod'

export const updateDealSchema = z.object({
  id: z.string().uuid('ID do deal inválido'),
  title: z.string().min(1, 'Título é obrigatório').optional(),
  contactId: z.string().uuid('ID do contato inválido').optional().nullable(),
  companyId: z.string().uuid('ID da empresa inválido').optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
})

export type UpdateDealInput = z.infer<typeof updateDealSchema>
