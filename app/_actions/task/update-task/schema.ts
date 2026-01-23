import { z } from 'zod'

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  dueDate: z.coerce.date().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
