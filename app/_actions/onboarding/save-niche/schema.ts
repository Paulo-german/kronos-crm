import { z } from 'zod'

export const saveNicheSchema = z.object({
  niche: z.string().min(1, 'Selecione um segmento'),
})
