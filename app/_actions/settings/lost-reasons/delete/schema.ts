import { z } from 'zod'

export const deleteLostReasonSchema = z.object({
  id: z.string().uuid(),
  replacementId: z.string().uuid().nullable().optional(),
})

export type DeleteLostReasonInput = z.infer<typeof deleteLostReasonSchema>
