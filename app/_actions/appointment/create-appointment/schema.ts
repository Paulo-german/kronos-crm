import { z } from 'zod'

/** Schema para o formulário (usa z.date() para compatibilidade com zodResolver) */
export const createAppointmentFormSchema = z
  .object({
    type: z.enum(['COMMERCIAL', 'SERVICE']),
    // contactId é opcional no estado inicial do form (campo ainda não preenchido)
    // mas obrigatório na submissão — validado via superRefine
    contactId: z.string().uuid('Contato é obrigatório').optional(),
    dealId: z.string().uuid().optional(),
    professionalId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    title: z.string().min(1, 'Título é obrigatório'),
    description: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    notes: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    startDate: z.date({ message: 'Data de início é obrigatória' }),
    // Para COMMERCIAL: obrigatório. Para SERVICE: calculado server-side a partir de service.duration
    endDate: z.date().optional(),
    assignedTo: z.string().uuid('Responsável é obrigatório'),
  })
  .superRefine((data, ctx) => {
    if (!data.contactId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contato é obrigatório',
        path: ['contactId'],
      })
    }
    if (data.type === 'COMMERCIAL' && !data.dealId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dealId obrigatório para COMMERCIAL',
        path: ['dealId'],
      })
    }
    if (data.type === 'COMMERCIAL' && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de fim é obrigatória para COMMERCIAL',
        path: ['endDate'],
      })
    }
    if (data.type === 'SERVICE' && !data.professionalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'professionalId obrigatório para SERVICE',
        path: ['professionalId'],
      })
    }
    if (data.type === 'SERVICE' && !data.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'serviceId obrigatório para SERVICE',
        path: ['serviceId'],
      })
    }
  })

/** Schema para a server action (usa z.coerce.date()) */
export const createAppointmentSchema = z
  .object({
    type: z.enum(['COMMERCIAL', 'SERVICE']),
    contactId: z.string().uuid('Contato é obrigatório'),
    dealId: z.string().uuid().optional(),
    professionalId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    title: z.string().min(1, 'Título é obrigatório'),
    description: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    notes: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    startDate: z.coerce.date({ message: 'Data de início é obrigatória' }),
    // Para COMMERCIAL: obrigatório. Para SERVICE: calculado server-side a partir de service.duration
    endDate: z.coerce.date().optional(),
    assignedTo: z.string().uuid('Responsável é obrigatório'),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'COMMERCIAL' && !data.dealId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dealId obrigatório para COMMERCIAL',
        path: ['dealId'],
      })
    }
    if (data.type === 'COMMERCIAL' && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de fim é obrigatória para COMMERCIAL',
        path: ['endDate'],
      })
    }
    if (data.type === 'SERVICE' && !data.professionalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'professionalId obrigatório para SERVICE',
        path: ['professionalId'],
      })
    }
    if (data.type === 'SERVICE' && !data.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'serviceId obrigatório para SERVICE',
        path: ['serviceId'],
      })
    }
  })

export type CreateAppointmentInput = z.input<typeof createAppointmentFormSchema>
