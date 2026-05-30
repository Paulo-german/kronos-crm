import 'server-only'
import { redis } from '@/_lib/redis'
import { db } from '@/_lib/prisma'
import { resolveSquadMember } from './resolve-squad-member'

interface ResolveCaptureFormAssigneeOptions {
  orgId: string
  formId: string
  distributionUserIds: string[]
  squadId: string | null
}

/**
 * Resolve o responsável de um lead capturado por um CaptureForm.
 * Modos mutuamente exclusivos: squad (usa squad.distributionModel) ou lista de membros (round-robin).
 * Fallback: OWNER da org, garantindo que o lead nunca fica órfão.
 */
export async function resolveCaptureFormAssignee(
  options: ResolveCaptureFormAssigneeOptions,
): Promise<string | null> {
  const { orgId, formId, distributionUserIds, squadId } = options

  // Modo Squad: delega para resolveSquadMember que respeita squad.distributionModel
  if (squadId) {
    const result = await resolveSquadMember({ orgId, squadId })
    return result?.userId ?? null
  }

  // Modo Membros: round-robin entre a lista configurada
  if (distributionUserIds.length > 0) {
    // Redis pode estar indisponível em runtime — fallback determinístico para o primeiro membro
    try {
      const counter = await redis.incr(`distribution:captureform:${formId}:index`)
      const index = (counter - 1) % distributionUserIds.length
      return distributionUserIds[index]
    } catch {
      return distributionUserIds[0]
    }
  }

  // Fallback: OWNER da organização
  const owner = await db.member.findFirst({
    where: { organizationId: orgId, role: 'OWNER' },
    select: { userId: true },
  })
  return owner?.userId ?? null
}
