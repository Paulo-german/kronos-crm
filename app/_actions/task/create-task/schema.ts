import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  dueDate: z.date().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
