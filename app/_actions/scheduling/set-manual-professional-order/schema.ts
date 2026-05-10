import { z } from 'zod'

export const setManualProfessionalOrderSchema = z.object({
  professionals: z
    .array(
      z.object({
        professionalId: z.string().uuid(),
        order: z.number().int().positive(),
      }),
    )
    .min(1),
})

export type SetManualProfessionalOrderInput = z.infer<typeof setManualProfessionalOrderSchema>
