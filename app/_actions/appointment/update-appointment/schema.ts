import { z } from 'zod'
import { AppointmentStatus } from '@prisma/client'

export const updateAppointmentSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).optional(),
    description: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      // Ao menos 1 campo além do id deve ser fornecido
      return (
        data.title !== undefined ||
        data.description !== undefined ||
        data.startDate !== undefined ||
        data.endDate !== undefined ||
        data.status !== undefined ||
        data.assignedTo !== undefined
      )
    },
    { message: 'Ao menos um campo deve ser fornecido para atualização' },
  )
  .refine(
    (data) => {
      // Se ambos startDate e endDate fornecidos, endDate > startDate
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate
      }
      return true
    },
    {
      message: 'Data de fim deve ser posterior à data de início',
      path: ['endDate'],
    },
  )

export type UpdateAppointmentInput = z.input<typeof updateAppointmentSchema>
