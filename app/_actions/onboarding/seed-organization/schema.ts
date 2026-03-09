import { z } from 'zod'

export const seedOrganizationSchema = z.object({
  agentName: z.string().optional(),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
})
