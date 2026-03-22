import { z } from 'zod'

export const connectZApiSchema = z.object({
  inboxId: z.string().uuid(),
  instanceId: z.string().min(1, 'Instance ID é obrigatório'),
  token: z.string().min(1, 'Token é obrigatório'),
  clientToken: z.string().min(1, 'Client-Token é obrigatório'),
})

export type ConnectZApiInput = z.infer<typeof connectZApiSchema>
