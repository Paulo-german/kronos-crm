import { z } from 'zod'
import { CaptureChannel, LegalBasis, LifecycleStage } from '@prisma/client'
import {
  CONTACT_NAME_MAX,
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  CONTACT_ROLE_MAX,
  CONTACT_INLINE_DEAL_TITLE_MAX,
} from '@/_lib/constants/field-limits'

export const contactSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(CONTACT_NAME_MAX),
    email: z.string().email('Email inválido').max(CONTACT_EMAIL_MAX).optional().or(z.literal('')),
    phone: z.string().max(CONTACT_PHONE_MAX).optional(),
    role: z.string().max(CONTACT_ROLE_MAX).optional(),
    companyId: z.string().uuid().optional().nullable(),
    isDecisionMaker: z.boolean(),
    assignedTo: z.string().uuid().optional().nullable(),
    lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
    firstCaptureChannel: z.nativeEnum(CaptureChannel).optional().nullable(),
    legalBasis: z.nativeEnum(LegalBasis).optional().nullable(),
    inlineDealTitle: z.string().max(CONTACT_INLINE_DEAL_TITLE_MAX).optional().nullable(),
    inlineDealPipelineStageId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const needsDeal =
      data.lifecycleStage === LifecycleStage.OPPORTUNITY ||
      data.lifecycleStage === LifecycleStage.CUSTOMER
    if (needsDeal && !data.inlineDealTitle?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o título da negociação',
        path: ['inlineDealTitle'],
      })
    }
    if (needsDeal && !data.inlineDealPipelineStageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione a etapa do pipeline',
        path: ['inlineDealPipelineStageId'],
      })
    }
  })

export type ContactInput = z.infer<typeof contactSchema>
