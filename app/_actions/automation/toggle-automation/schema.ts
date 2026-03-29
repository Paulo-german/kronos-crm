import { z } from 'zod'

export const toggleAutomationSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
})

export type ToggleAutomationInput = z.infer<typeof toggleAutomationSchema>
