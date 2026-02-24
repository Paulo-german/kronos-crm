import { z } from 'zod'
import { passwordRules } from '@/_actions/auth/sign-up/schema'

const passwordSchema = passwordRules.reduce(
  (schema, rule) =>
    schema.refine((val) => rule.regex.test(val), { message: rule.label }),
  z.string(),
)

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
