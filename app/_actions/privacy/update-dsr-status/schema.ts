import { z } from 'zod'
import { DsrRequestStatus } from '@prisma/client'

export const updateDsrStatusSchema = z.object({
  dsrRequestId: z.string().uuid(),
  status: z.nativeEnum(DsrRequestStatus),
  notes: z.string().max(1000).optional(),
})
