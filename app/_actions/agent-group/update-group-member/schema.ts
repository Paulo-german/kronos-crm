import { z } from 'zod'

export const updateGroupMemberSchema = z.object({
  memberId: z.string().uuid(),
  scopeLabel: z.string().trim().min(1, 'Descrição do escopo é obrigatória').max(200).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateGroupMemberInput = z.input<typeof updateGroupMemberSchema>
