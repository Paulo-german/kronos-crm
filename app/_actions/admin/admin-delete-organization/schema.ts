import { z } from 'zod'

export const adminDeleteOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  adminKey: z.string().min(1, 'Senha obrigatória'),
  confirmName: z.string().trim().min(1),
})

export type AdminDeleteOrganizationInput = z.infer<typeof adminDeleteOrganizationSchema>
