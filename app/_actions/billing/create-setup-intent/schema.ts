import { z } from 'zod'

// SetupIntent não precisa de input além do contexto da org
// Podemos deixar vazio ou adicionar metadata opcional no futuro
export const createSetupIntentSchema = z.object({})

export type CreateSetupIntentInput = z.infer<typeof createSetupIntentSchema>
