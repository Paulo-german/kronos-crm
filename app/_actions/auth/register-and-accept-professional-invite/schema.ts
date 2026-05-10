import { z } from 'zod'
import { passwordRules } from '@/_actions/auth/sign-up/schema'

export const registerAndAcceptProfessionalInviteSchema = z.object({
  token: z.string().uuid(),
  fullName: z.string().min(4, 'Você precisa preencher seu nome completo'),
  password: passwordRules.reduce(
    (schema, rule) =>
      schema.refine((val) => rule.regex.test(val), { message: rule.label }),
    z.string(),
  ),
})

export type RegisterAndAcceptProfessionalInviteSchema = z.infer<
  typeof registerAndAcceptProfessionalInviteSchema
>
