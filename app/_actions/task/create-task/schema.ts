import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  dueDate: z.date().nullable().optional(),
  type: z.enum(['TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL']),
  isCompleted: z.boolean().default(false).optional(),
  dealId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: quem é responsável
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
