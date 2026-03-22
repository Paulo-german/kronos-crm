import { z } from 'zod'

export const upsertFollowUpSchema = z.object({
  id: z.string().uuid().optional(), // undefined = criar, preenchido = atualizar
  agentId: z.string().uuid(),
  delayMinutes: z.number().int().min(15).max(10080), // min 15 min, max 7 dias
  messageContent: z.string().trim().min(1, 'Mensagem não pode ser vazia').max(1000),
  isActive: z.boolean().default(true),
  agentStepIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma etapa'),
  order: z.number().int().min(0).optional(), // Calculado no backend se não fornecido
})

export type UpsertFollowUpInput = z.infer<typeof upsertFollowUpSchema>
