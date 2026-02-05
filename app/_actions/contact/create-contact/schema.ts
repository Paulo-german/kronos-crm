import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  cpf: z.string().optional(),
  companyId: z.string().uuid().optional().nullable(),
  isDecisionMaker: z.boolean(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: quem é responsável
})

export type ContactInput = z.infer<typeof contactSchema>
