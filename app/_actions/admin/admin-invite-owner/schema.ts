import { z } from 'zod'

export const adminInviteOwnerSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
})

export type AdminInviteOwnerInput = z.infer<typeof adminInviteOwnerSchema>
