import { z } from 'zod'

export const createTaskSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  dueDate: z.coerce.date().optional().nullable(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
