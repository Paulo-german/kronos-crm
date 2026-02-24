import { z } from 'zod'

export const passwordRules = [
  { label: 'Mínimo de 8 caracteres', regex: /.{8,}/ },
  { label: 'Uma letra maiúscula', regex: /[A-Z]/ },
  { label: 'Uma letra minúscula', regex: /[a-z]/ },
  { label: 'Um número', regex: /[0-9]/ },
  { label: 'Um caractere especial', regex: /[\W_]/ },
]

export const signUpSchema = z.object({
  fullName: z.string().min(4, 'Você precisa preencher seu nome completo'),
  email: z.string().email('Por favor, insira um e-mail válido'),
  password: passwordRules.reduce(
    (schema, rule) =>
      schema.refine((val) => rule.regex.test(val), { message: rule.label }),
    z.string(),
  ),
  captchaToken: z.string().min(1, 'Token de verificação é obrigatório'),
})

export type SignUpSchema = z.infer<typeof signUpSchema>
