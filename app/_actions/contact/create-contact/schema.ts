import { z } from 'zod'
import { CaptureChannel, LifecycleStage } from '@prisma/client'

export const contactSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    role: z.string().optional(),
    cpf: z.string().optional(),
    companyId: z.string().uuid().optional().nullable(),
    isDecisionMaker: z.boolean(),
    assignedTo: z.string().uuid().optional().nullable(),
    lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
    firstCaptureChannel: z.nativeEnum(CaptureChannel).optional().nullable(),
    inlineDealTitle: z.string().optional().nullable(),
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
