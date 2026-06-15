import { z } from 'zod'
import { DEAL_TITLE_MAX, DEAL_NOTES_MAX } from '@/_lib/constants/field-limits'

export const createDealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(DEAL_TITLE_MAX),
  stageId: z.string().uuid('ID da etapa inválido'),
  contactId: z.string().uuid('ID do contato inválido').optional().nullable(),
  companyId: z.string().uuid('ID da empresa inválido').optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: quem é responsável
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().max(DEAL_NOTES_MAX).optional().nullable(),
})

export type CreateDealInput = z.infer<typeof createDealSchema>

// Schema para formulário (sem nullable, usa undefined)
export const dealFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(DEAL_TITLE_MAX),
  stageId: z.string().min(1, 'Etapa é obrigatória'),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().max(DEAL_NOTES_MAX).optional(),
})

export type DealFormInput = z.infer<typeof dealFormSchema>
