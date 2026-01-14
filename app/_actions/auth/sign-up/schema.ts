import { z } from 'zod'

export const signUpSchema = z.object({
  fullName: z.string().min(4, 'Você precisa preencher seu nome completo'),
  email: z.string().email('Por favor, insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

export type SignUpSchema = z.infer<typeof signUpSchema>
