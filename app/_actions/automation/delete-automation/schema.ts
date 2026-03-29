import { z } from 'zod'

export const deleteAutomationSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteAutomationInput = z.infer<typeof deleteAutomationSchema>
