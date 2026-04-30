import { z } from 'zod'

export const syncStripeSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  stripeSubscriptionId: z
    .string()
    .trim()
    .regex(/^sub_[A-Za-z0-9]+$/, 'ID Stripe inválido (esperado sub_xxx)'),
  stripeCustomerId: z
    .string()
    .trim()
    .regex(/^cus_[A-Za-z0-9]+$/, 'Customer ID Stripe inválido (esperado cus_xxx)')
    .optional(),
})

export type SyncStripeSubscriptionInput = z.infer<
  typeof syncStripeSubscriptionSchema
>
