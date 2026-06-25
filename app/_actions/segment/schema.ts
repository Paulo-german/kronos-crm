import { z } from 'zod'
import { CustomerStatus, LifecycleStage } from '@prisma/client'

const HEALTH_SCORE_MIN = 0
const HEALTH_SCORE_MAX = 100

// Shape de ContactFilters validado no servidor — nunca confiar no client.
// Espelha app/_components/contacts/_lib/contact-filters.ts (nativos v1).
export const contactFiltersSchema = z.object({
  companyId: z.string().uuid().nullable().default(null),
  isDecisionMaker: z.boolean().nullable().default(null),
  hasDeals: z.boolean().nullable().default(null),
  lifecycleStages: z.array(z.nativeEnum(LifecycleStage)).default([]),
  customerStatuses: z.array(z.nativeEnum(CustomerStatus)).default([]),
  healthScoreMin: z
    .number()
    .int()
    .min(HEALTH_SCORE_MIN)
    .max(HEALTH_SCORE_MAX)
    .nullable()
    .default(null),
  healthScoreMax: z
    .number()
    .int()
    .min(HEALTH_SCORE_MIN)
    .max(HEALTH_SCORE_MAX)
    .nullable()
    .default(null),
  // Intervalo de data de criação (ISO 'yyyy-MM-dd')
  createdAtFrom: z.string().nullable().default(null),
  createdAtTo: z.string().nullable().default(null),
})

export const createSegmentSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  filters: contactFiltersSchema,
})

export const updateSegmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  filters: contactFiltersSchema,
})

export const deleteSegmentSchema = z.object({
  id: z.string().uuid(),
})

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>
