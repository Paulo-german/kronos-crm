import { z } from 'zod'

export const deleteLostReasonSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteLostReasonInput = z.infer<typeof deleteLostReasonSchema>
