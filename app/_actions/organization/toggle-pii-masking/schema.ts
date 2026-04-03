import { z } from 'zod'

export const togglePiiMaskingSchema = z.object({
  hidePiiFromMembers: z.boolean(),
})

export type TogglePiiMaskingInput = z.infer<typeof togglePiiMaskingSchema>
