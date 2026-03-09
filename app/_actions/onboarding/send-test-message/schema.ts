import { z } from 'zod'

export const sendTestMessageSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, 'Número de telefone muito curto')
    .max(20, 'Número de telefone muito longo')
    .regex(/\d{10,}/, 'Número deve conter ao menos 10 dígitos'),
})
