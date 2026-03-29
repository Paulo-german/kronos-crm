import { z } from 'zod'

export const getAutomationDetailSchema = z.object({
  id: z.string().uuid(),
})
