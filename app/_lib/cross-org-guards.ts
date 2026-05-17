import 'server-only'
import { db } from '@/_lib/prisma'

/**
 * Garante que um pipeline pertence à organização do contexto da action.
 * Use para validar FKs vindas do client antes de gravar registros.
 */
export async function assertPipelineBelongsToOrg(
  pipelineId: string,
  orgId: string,
): Promise<void> {
  const pipeline = await db.pipeline.findFirst({
    where: { id: pipelineId, organizationId: orgId },
    select: { id: true },
  })
  if (!pipeline) throw new Error('Pipeline não pertence a esta organização.')
}

/**
 * Garante que um usuário é membro ativo da organização.
 * Member.userId é nullable (convites pendentes) — filtramos por not null implícito ao casar com userId.
 */
export async function assertUserBelongsToOrg(
  userId: string,
  orgId: string,
): Promise<void> {
  const member = await db.member.findFirst({
    where: { userId, organizationId: orgId },
    select: { userId: true },
  })
  if (!member) throw new Error('Usuário não pertence a esta organização.')
}
