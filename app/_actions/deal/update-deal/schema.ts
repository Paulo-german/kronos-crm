import { z } from 'zod'

export const updateDealSchema = z.object({
  id: z.string().uuid('ID do deal inválido'),
  title: z.string().min(1, 'Título é obrigatório').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().optional().nullable(),
  contactId: z.string().uuid('ID do contato inválido').optional().nullable(),
  companyId: z.string().uuid('ID da empresa inválido').optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: transferência de ownership
})

export type UpdateDealInput = z.infer<typeof updateDealSchema>
