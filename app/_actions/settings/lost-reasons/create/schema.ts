import { z } from 'zod'

export const createLostReasonSchema = z.object({
  name: z.string().min(3, 'O motivo deve ter pelo menos 3 caracteres'),
})

export type CreateLostReasonInput = z.infer<typeof createLostReasonSchema>
