import 'server-only'
import { redis } from '@/_lib/redis'
import { db } from '@/_lib/prisma'

/**
 * Distribui via round-robin entre uma lista de userIds usando Redis como contador.
 * Desacoplado de inbox — usa chave própria de agendamentos por org.
 * Fallback para dono da org se a lista estiver vazia ou se o Redis falhar.
 */
export async function roundRobinAssign(orgId: string, userIds: string[]): Promise<string | null> {
  if (userIds.length === 0) return resolveOrgOwner(orgId)

  try {
    const counter = await redis.incr(`distribution:appointments:${orgId}:index`)
    const index = (counter - 1) % userIds.length
    return userIds[index]
  } catch (error) {
    console.warn('[roundRobin] Redis INCR falhou, usando primeiro da lista:', { orgId, error })
    return userIds[0]
  }
}

async function resolveOrgOwner(orgId: string): Promise<string | null> {
  const owner = await db.member.findFirst({
    where: { organizationId: orgId, role: 'OWNER', status: 'ACCEPTED' },
    select: { userId: true },
  })
  return owner?.userId ?? null
}
