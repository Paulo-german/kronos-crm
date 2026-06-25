import { z } from 'zod'
import { CustomerStatus, LifecycleStage } from '@prisma/client'

export const exportContactsSchema = z.object({
  search: z.string().default(''),
  assignedTo: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  isDecisionMaker: z.boolean().optional(),
  hasDeals: z.boolean().optional(),
  lifecycleStages: z.array(z.nativeEnum(LifecycleStage)).default([]),
  customerStatuses: z.array(z.nativeEnum(CustomerStatus)).default([]),
  healthScoreMin: z.number().optional(),
  healthScoreMax: z.number().optional(),
})

export type ExportContactsInput = z.infer<typeof exportContactsSchema>
