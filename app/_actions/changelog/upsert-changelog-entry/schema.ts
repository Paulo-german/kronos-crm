import { z } from 'zod'
import { ChangelogEntryType } from '@prisma/client'

export const upsertChangelogEntrySchema = z.object({
  /** Presente somente em modo de edição. Ausente no create. */
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  type: z.nativeEnum(ChangelogEntryType, { error: 'Tipo é obrigatório' }),
  isPublished: z.boolean().default(false),
})

export type UpsertChangelogEntryInput = z.infer<typeof upsertChangelogEntrySchema>
