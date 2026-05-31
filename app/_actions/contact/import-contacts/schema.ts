import { LifecycleStage } from '@prisma/client'
import { z } from 'zod'

export const importRowSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(70),
  email: z.string().email('Email inválido').max(120).optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  role: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  isDecisionMaker: z.boolean().default(false),
})

export const importContactsSchema = z.object({
  // Cap no schema evita exaustão de memória antes da verificação de quota na action
  rows: z.array(importRowSchema).min(1, 'Envie ao menos 1 contato').max(5000),
  lifecycleStage: z.nativeEnum(LifecycleStage).default('LEAD'),
})

export type ImportRow = z.infer<typeof importRowSchema>
export type ImportContactsInput = z.infer<typeof importContactsSchema>
