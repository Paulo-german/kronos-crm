import { z } from 'zod'

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  // OWNER e SUPPORT são excluídos intencionalmente:
  // OWNER só via transferência de propriedade; SUPPORT só via fluxo de convite dedicado
  role: z.enum(['ADMIN', 'MEMBER']),
})

export type UpdateMemberRoleSchema = z.infer<typeof updateMemberRoleSchema>
