import { schedules, logger, runs } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import {
  promoteNextQueuedForInbox,
  triggerBroadcastRun,
} from './lib/broadcast-queue'

// Statuses do Trigger.dev em que a run ainda está viva (vai retomar sozinha).
// Qualquer outro = run morta → o broadcast RUNNING precisa ser re-disparado.
const ALIVE_RUN_STATUSES = new Set([
  'WAITING',
  'EXECUTING',
  'QUEUED',
  'DELAYED',
  'REATTEMPTING',
  'FROZEN',
  'DEQUEUED',
])

const BATCH = 100

// ---------------------------------------------------------------------------
// Watchdog dos disparos — liveness, não é o motor
// ---------------------------------------------------------------------------
//
// O motor é a task durável `process-broadcast` (uma run por disparo). Este cron
// só garante que nada fica preso: promove agendados/enfileirados e re-dispara
// runs que morreram (deploy, crash). Tudo idempotente — re-disparar nunca
// reenvia (recipients SENT não são re-claimados).
export const broadcastWatchdogCron = schedules.task({
  id: 'broadcast-watchdog-cron',
  cron: '*/5 * * * *',
  run: async () => {
    // 1. SCHEDULED cuja janela chegou → RUNNING (disparo real no passo 3).
    await db.$executeRawUnsafe('SELECT promote_scheduled_broadcasts()')
    // 2. Recipients travados em SENDING (crash entre claim e envio) → PENDING.
    await db.$executeRawUnsafe('SELECT recover_stuck_sending_recipients()')

    // 3. Inboxes com QUEUED e sem RUNNING → promove o próximo da fila.
    const queuedInboxes = await db.broadcast.findMany({
      where: { status: 'QUEUED' },
      distinct: ['inboxId'],
      select: { inboxId: true },
      take: BATCH,
    })
    for (const { inboxId } of queuedInboxes) {
      await promoteNextQueuedForInbox(inboxId)
    }

    // 4. RUNNING sem run viva → re-dispara (cobre deploy/crash e recém-promovidos).
    const running = await db.broadcast.findMany({
      where: { status: 'RUNNING' },
      select: { id: true, inboxId: true, triggerRunId: true },
      take: BATCH,
    })

    let restarted = 0
    for (const broadcast of running) {
      let alive = false
      if (broadcast.triggerRunId) {
        try {
          const run = await runs.retrieve(broadcast.triggerRunId)
          alive = ALIVE_RUN_STATUSES.has(run.status)
        } catch {
          alive = false
        }
      }
      if (!alive) {
        await triggerBroadcastRun(broadcast.id, broadcast.inboxId)
        restarted++
      }
    }

    logger.info('[broadcast-watchdog] tick', {
      queuedInboxes: queuedInboxes.length,
      running: running.length,
      restarted,
    })

    return {
      queuedInboxes: queuedInboxes.length,
      running: running.length,
      restarted,
    }
  },
})
