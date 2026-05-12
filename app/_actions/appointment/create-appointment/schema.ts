import { z } from 'zod'

/** Schema para o formulário (usa z.date() para compatibilidade com zodResolver) */
export const createAppointmentFormSchema = z
  .object({
    type: z.enum(['MEETING', 'BOOKING']),
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
    // Para MEETING: obrigatório. Para BOOKING: calculado server-side a partir de service.duration
    endDate: z.date().optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.contactId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contato é obrigatório',
        path: ['contactId'],
      })
    }
    if (data.type === 'MEETING' && !data.dealId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dealId obrigatório para MEETING',
        path: ['dealId'],
      })
    }
    if (data.type === 'MEETING' && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de fim é obrigatória para MEETING',
        path: ['endDate'],
      })
    }
    if (data.type === 'BOOKING' && !data.professionalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'professionalId obrigatório para BOOKING',
        path: ['professionalId'],
      })
    }
    if (data.type === 'BOOKING' && !data.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'serviceId obrigatório para BOOKING',
        path: ['serviceId'],
      })
    }
    // Responsável obrigatório apenas para MEETING (BOOKING defaulta para ctx.userId no servidor)
    if (data.type === 'MEETING' && !data.assignedTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Responsável é obrigatório para agendamentos comerciais',
        path: ['assignedTo'],
      })
    }
  })

/** Schema para a server action (usa z.coerce.date()) */
export const createAppointmentSchema = z
  .object({
    type: z.enum(['MEETING', 'BOOKING']),
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
    // Para MEETING: obrigatório. Para BOOKING: calculado server-side a partir de service.duration
    endDate: z.coerce.date().optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'MEETING' && !data.dealId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dealId obrigatório para MEETING',
        path: ['dealId'],
      })
    }
    if (data.type === 'MEETING' && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de fim é obrigatória para MEETING',
        path: ['endDate'],
      })
    }
    if (data.type === 'BOOKING' && !data.professionalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'professionalId obrigatório para BOOKING',
        path: ['professionalId'],
      })
    }
    if (data.type === 'BOOKING' && !data.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'serviceId obrigatório para BOOKING',
        path: ['serviceId'],
      })
    }
    // Espelha a validação do form schema: MEMBER que chama a action diretamente
    // sem assignedTo em MEETING receberia ctx.userId via resolveAssignedTo, mas
    // ADMIN/OWNER passando intencionalmente um assignedTo inválido seria silencioso.
    // O guard aqui garante que a invariante vale independente do caller.
    if (data.type === 'MEETING' && !data.assignedTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Responsável é obrigatório para agendamentos comerciais',
        path: ['assignedTo'],
      })
    }
  })

export type CreateAppointmentInput = z.input<typeof createAppointmentFormSchema>
