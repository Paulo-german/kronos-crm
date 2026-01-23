import { z } from 'zod'

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  dueDate: z.date().nullable().optional(),
  type: z
    .enum(['TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL'])
    .optional(),
  isCompleted: z.boolean().optional(),
  dealId: z.string().uuid().nullable().optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
