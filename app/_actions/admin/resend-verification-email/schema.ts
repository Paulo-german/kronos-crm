import { z } from 'zod'

export const resendVerificationEmailSchema = z.object({
  email: z.string().email(),
})
