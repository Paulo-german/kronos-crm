import { z } from 'zod'
import { DsrRequestType } from '@prisma/client'

export const requestDsrSchema = z.object({
  requestType: z.nativeEnum(DsrRequestType),
  requesterEmail: z.string().email(),
  requesterName: z.string().max(255).optional(),
  contactId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
})
