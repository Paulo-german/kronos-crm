import { z } from 'zod'

export const connectEvolutionSelfHostedSchema = z.object({
  inboxId: z.string().uuid(),
  instanceName: z.string().trim().min(1, 'Nome da instância obrigatório'),
})

export type ConnectEvolutionSelfHostedInput = z.infer<typeof connectEvolutionSelfHostedSchema>
