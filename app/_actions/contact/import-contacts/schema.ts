import { z } from 'zod'

const importRowSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  cpf: z.string().optional(),
  companyName: z.string().optional(),
  isDecisionMaker: z.boolean().default(false),
})

export const importContactsSchema = z.object({
  rows: z.array(importRowSchema).min(1, 'Envie ao menos 1 contato'),
})

export type ImportRow = z.infer<typeof importRowSchema>
export type ImportContactsInput = z.infer<typeof importContactsSchema>
