import { z } from 'zod'

export const updateContactSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Nome não pode ser vazio').optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    role: z.string().optional(),
    cpf: z.string().optional(),
    companyId: z.string().uuid().optional().nullable(),
    isDecisionMaker: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: 'Envie pelo menos um campo para atualizar',
  })

export type UpdateContactInput = z.infer<typeof updateContactSchema>
