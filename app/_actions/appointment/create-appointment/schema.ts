import { z } from 'zod'

/** Schema para o formulário (usa z.date() para compatibilidade com zodResolver) */
export const createAppointmentFormSchema = z.object({
  title: z.string().min(1, 'Titulo é obrigatório'),
  description: z.string().optional(),
  startDate: z.date({ message: 'Data de início é obrigatória' }),
  endDate: z.date({ message: 'Data de fim é obrigatória' }),
  dealId: z.string().uuid('Negociação é obrigatória'),
  assignedTo: z.string().uuid().optional().nullable(),
})

/** Schema para a server action (usa z.coerce.date() + refinement) */
export const createAppointmentSchema = z
  .object({
    title: z.string().min(1, 'Titulo é obrigatório'),
    description: z.string().optional(),
    startDate: z.coerce.date({ message: 'Data de início é obrigatória' }),
    endDate: z.coerce.date({ message: 'Data de fim é obrigatória' }),
    dealId: z.string().uuid('Negociação é obrigatória'),
    assignedTo: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endDate'],
  })

export type CreateAppointmentInput = z.infer<
  typeof createAppointmentFormSchema
>
