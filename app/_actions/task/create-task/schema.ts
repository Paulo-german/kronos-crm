import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  dealId: z
    .string({ message: 'Vincular a um negócio é obrigatório' })
    .min(1, 'Vincular a um negócio é obrigatório')
    .uuid('ID de negócio inválido'),
  dueDate: z
    .date({ message: 'Data e hora são obrigatórias' })
    .refine((date) => !isNaN(date.getTime()), {
      message: 'Data/hora inválida. Verifique o formato.',
    }),
  type: z.enum(['TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL']),
  isCompleted: z.boolean().default(false).optional(),
  assignedTo: z.string().uuid().optional().nullable(), // RBAC: quem é responsável
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
