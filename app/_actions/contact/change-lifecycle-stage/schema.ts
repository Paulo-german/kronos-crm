import { LifecycleStage } from '@prisma/client'
import { z } from 'zod'

export const changeLifecycleStageSchema = z.object({
  contactId: z.string().uuid(),
  toStage: z.nativeEnum(LifecycleStage),
})
