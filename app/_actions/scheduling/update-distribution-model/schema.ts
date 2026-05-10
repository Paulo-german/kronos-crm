import { z } from 'zod'

const DISTRIBUTION_MODELS = ['UTILIZATION', 'ROUND_ROBIN', 'FIRST_AVAILABLE', 'LOYALTY', 'MANUAL'] as const

// MANUAL é excluído como secondaryDistributionModel: fallback é por carga, não por hierarquia.
// LOYALTY é excluído como secondary: não faz sentido aninhar fidelidade com fidelidade.
const SECONDARY_MODELS = ['UTILIZATION', 'ROUND_ROBIN', 'FIRST_AVAILABLE'] as const

export const updateDistributionModelSchema = z
  .object({
    distributionModel: z.enum(DISTRIBUTION_MODELS),
    secondaryDistributionModel: z.enum(SECONDARY_MODELS).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // secondaryDistributionModel só faz sentido quando o modelo primário é LOYALTY
    if (data.distributionModel !== 'LOYALTY' && data.secondaryDistributionModel != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'secondaryDistributionModel só é válido quando distributionModel é LOYALTY',
        path: ['secondaryDistributionModel'],
      })
    }
  })

export type UpdateDistributionModelInput = z.infer<typeof updateDistributionModelSchema>
