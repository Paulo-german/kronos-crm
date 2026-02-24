import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('O email informado é inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  redirectTo: z.string().startsWith('/').optional(),
})

export type SignInSchema = z.infer<typeof signInSchema>
