import { z } from 'zod'

/** Schema para o formulário (usa z.date() para compatibilidade com zodResolver) */
export const createAppointmentFormSchema = z
  .object({
    title: z.string().min(1, 'Titulo é obrigatório'),
    description: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    startDate: z.date({ message: 'Data de início é obrigatória' }),
    endDate: z.date({ message: 'Data de fim é obrigatória' }),
    dealId: z.string().uuid('Negociação é obrigatória'),
    assignedTo: z.string().uuid('Responsável é obrigatório'),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endDate'],
  })

/** Schema para a server action (usa z.coerce.date() + refinement) */
export const createAppointmentSchema = z
  .object({
    title: z.string().min(1, 'Titulo é obrigatório'),
    description: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    startDate: z.coerce.date({ message: 'Data de início é obrigatória' }),
    endDate: z.coerce.date({ message: 'Data de fim é obrigatória' }),
    dealId: z.string().uuid('Negociação é obrigatória'),
    assignedTo: z.string().uuid('Responsável é obrigatório'),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endDate'],
  })

export type CreateAppointmentInput = z.input<typeof createAppointmentFormSchema>
