import { z } from 'zod'
import { SquadType, SalesDistributionModel } from '@prisma/client'

const SQUAD_NAME_MAX = 60

export const updateSquadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(SQUAD_NAME_MAX, 'Nome muito longo').optional(),
  description: z.string().trim().optional().nullable(),
  avatarUrl: z.string().url('URL inválida').optional().nullable(),
  type: z.nativeEnum(SquadType).optional(),
  isDefault: z.boolean().optional(),
  distributionModel: z.nativeEnum(SalesDistributionModel).optional(),
})

export type UpdateSquadInput = z.infer<typeof updateSquadSchema>
