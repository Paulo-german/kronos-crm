import { z } from 'zod'

export const createTaskSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  dueDate: z.coerce.date({ message: 'Data e hora são obrigatórias' }),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: quem é responsável
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
