import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, insira um e-mail válido'),
})

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>
