import { z } from 'zod'
import { SquadType } from '@prisma/client'

const SQUAD_NAME_MAX = 60

export const createSquadSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(SQUAD_NAME_MAX, 'Nome muito longo'),
  description: z.string().trim().optional().nullable(),
  avatarUrl: z.string().url('URL inválida').optional().nullable(),
  type: z.nativeEnum(SquadType),
  isDefault: z.boolean().optional(),
})

export type CreateSquadInput = z.infer<typeof createSquadSchema>
