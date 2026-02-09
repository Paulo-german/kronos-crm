import { z } from 'zod'

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  dueDate: z
    .date({ message: 'Data e hora são obrigatórias' })
    .refine((date) => !isNaN(date.getTime()), {
      message: 'Data/hora inválida. Verifique o formato.',
    }),
  dealId: z
    .string({ message: 'Vincular a um negócio é obrigatório' })
    .min(1, 'Vincular a um negócio é obrigatório')
    .uuid('ID de negócio inválido'),
  type: z
    .enum(['TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL'])
    .optional(),
  isCompleted: z.boolean().optional(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: transferência de ownership
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
