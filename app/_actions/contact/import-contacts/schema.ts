import { LegalBasis, LifecycleStage } from '@prisma/client'
import { z } from 'zod'
import {
  CONTACT_NAME_MAX,
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  CONTACT_ROLE_MAX,
  CONTACT_COMPANY_NAME_MAX,
} from '@/_lib/constants/field-limits'

export const importRowSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(CONTACT_NAME_MAX),
  email: z.string().email('Email inválido').max(CONTACT_EMAIL_MAX).optional().or(z.literal('')),
  phone: z.string().max(CONTACT_PHONE_MAX).optional(),
  role: z.string().max(CONTACT_ROLE_MAX).optional(),
  companyName: z.string().max(CONTACT_COMPANY_NAME_MAX).optional(),
  isDecisionMaker: z.boolean().default(false),
})

export const importContactsSchema = z.object({
  // Cap no schema evita exaustão de memória antes da verificação de quota na action
  rows: z.array(importRowSchema).min(1, 'Envie ao menos 1 contato').max(5000),
  lifecycleStage: z.nativeEnum(LifecycleStage).default('LEAD'),
  // Base legal selecionada pelo operador para o lote inteiro
  legalBasis: z.nativeEnum(LegalBasis),
  // z.literal(true) força a confirmação explícita da base legal no parse
  legalBasisConfirmed: z.literal(true),
})

export type ImportRow = z.infer<typeof importRowSchema>
export type ImportContactsInput = z.infer<typeof importContactsSchema>
