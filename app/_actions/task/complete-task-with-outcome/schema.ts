import { z } from 'zod'

export const completeTaskWithOutcomeSchema = z.object({
  id: z.string().uuid(),
  outcomeType: z.string().min(1, 'Selecione um resultado'),
  outcomeNotes: z.string().optional().nullable(),
})
