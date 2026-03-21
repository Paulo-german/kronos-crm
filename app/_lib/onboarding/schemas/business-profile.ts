import { z } from 'zod'

export const businessProfileSchema = z.object({
  companyName: z.string().min(1),
  companyDescription: z.string().min(1),
  productsOrServices: z.string().min(1),
  targetAudience: z.string().min(1),
  salesProcess: z.string().min(1),
  communicationTone: z.enum(['formal', 'professional', 'friendly', 'casual']),
  differentials: z.array(z.string()),
  restrictions: z.array(z.string()),
  businessHours: z.object({
    weekdays: z.object({ start: z.string(), end: z.string() }),
    saturday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
    sunday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
  }),
  agentRole: z.enum(['sdr', 'closer', 'support', 'receptionist', 'custom']),
  agentName: z.string().optional(),
})

export type BusinessProfile = z.infer<typeof businessProfileSchema>
