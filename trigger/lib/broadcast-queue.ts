import { tasks } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
// Import só de tipo: não cria ciclo em runtime (é apagado na compilação).
import type { processBroadcast } from '../process-broadcast'

/**
 * Dispara a run durável de um broadcast e persiste o runId (cancelamento +
 * liveness). concurrencyKey por inbox é uma salvaguarda; a serialização real
 * (1 disparo ativo por número) é garantida pelo status QUEUED + promoteNext.
 */
export async function triggerBroadcastRun(
  broadcastId: string,
  inboxId: string,
): Promise<void> {
  const handle = await tasks.trigger<typeof processBroadcast>(
    'process-broadcast',
    { broadcastId },
    { concurrencyKey: inboxId },
  )
  await db.broadcast.update({
    where: { id: broadcastId },
    data: { triggerRunId: handle.id },
  })
}

/**
 * Promove o próximo broadcast QUEUED de uma inbox a RUNNING e o dispara — só se
 * não houver outro RUNNING na mesma inbox (serialização por número). Atômico via
 * transação para evitar promover dois ao mesmo tempo.
 */
export async function promoteNextQueuedForInbox(
  inboxId: string,
): Promise<void> {
  const nextId = await db.$transaction(async (tx) => {
    const running = await tx.broadcast.count({
      where: { inboxId, status: 'RUNNING' },
    })
    if (running > 0) return null

    const next = await tx.broadcast.findFirst({
      where: { inboxId, status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!next) return null

    await tx.broadcast.update({
      where: { id: next.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    })
    return next.id
  })

  if (nextId) await triggerBroadcastRun(nextId, inboxId)
}
