import { z } from 'zod'

export const previewPlanChangeSchema = z.object({
  targetPriceId: z.string().min(1, 'Target price ID é obrigatório'),
})

export type PreviewPlanChangeInput = z.infer<typeof previewPlanChangeSchema>
