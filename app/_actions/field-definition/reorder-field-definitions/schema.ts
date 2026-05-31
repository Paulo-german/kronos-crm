import { z } from 'zod'
import { EntityType } from '@prisma/client'

export const reorderFieldDefinitionsSchema = z.object({
  entityType: z.nativeEnum(EntityType),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
})

export type ReorderFieldDefinitionsInput = z.infer<typeof reorderFieldDefinitionsSchema>
