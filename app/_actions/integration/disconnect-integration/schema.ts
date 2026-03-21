import { z } from 'zod'

export const disconnectIntegrationSchema = z.object({
  integrationId: z.string().uuid(),
})

export type DisconnectIntegrationInput = z.infer<typeof disconnectIntegrationSchema>
