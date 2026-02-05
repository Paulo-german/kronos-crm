import { z } from 'zod'

export const createDealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  stageId: z.string().uuid('ID da etapa inválido'),
  contactId: z.string().uuid('ID do contato inválido').optional().nullable(),
  companyId: z.string().uuid('ID da empresa inválido').optional().nullable(),
  expectedCloseDate: z.date().optional(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: quem é responsável
})

export type CreateDealInput = z.infer<typeof createDealSchema>

// Schema para formulário (sem nullable, usa undefined)
export const dealFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  stageId: z.string().min(1, 'Etapa é obrigatória'),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  expectedCloseDate: z.date().optional(),
  assignedTo: z.string().optional(),
})

export type DealFormInput = z.infer<typeof dealFormSchema>
