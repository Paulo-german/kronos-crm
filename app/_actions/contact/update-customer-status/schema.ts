import { CustomerStatus } from '@prisma/client'
import { z } from 'zod'

export const updateCustomerStatusSchema = z.object({
  contactId: z.string().uuid(),
  status: z.enum([
    CustomerStatus.ACTIVE,
    CustomerStatus.DORMANT,
    CustomerStatus.CHURNED,
  ]),
})
