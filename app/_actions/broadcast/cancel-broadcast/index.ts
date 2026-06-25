'use server'

import { BroadcastRecipientStatus, BroadcastStatus } from '@prisma/client'
import { runs } from '@trigger.dev/sdk/v3'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import {
  canAccessRecord,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import { promoteNextQueuedForInbox } from '@/../trigger/lib/broadcast-queue'
import { cancelBroadcastSchema } from '../schema'

// Estados que ainda podem ser cancelados (têm trabalho pendente ou agendado)
const CANCELLABLE_STATUSES: BroadcastStatus[] = [
  BroadcastStatus.DRAFT,
  BroadcastStatus.SCHEDULED,
  BroadcastStatus.QUEUED,
  BroadcastStatus.RUNNING,
]

export const cancelBroadcast = orgActionClient
  .schema(cancelBroadcastSchema)
  .action(async ({ parsedInput: { broadcastId }, ctx }) => {
    // 1. Permissão base
    requirePermission(canPerformAction(ctx, 'broadcast', 'delete'))

    // 2. Disparo precisa existir e pertencer à organização
    const broadcast = await db.broadcast.findFirst({
      where: { id: broadcastId, organizationId: ctx.orgId },
      select: {
        id: true,
        status: true,
        createdBy: true,
        inboxId: true,
        triggerRunId: true,
      },
    })

    if (!broadcast) {
      throw new Error('Disparo não encontrado.')
    }

    // 3. Ownership (redundante para elevated, mas mantém a regra explícita)
    requirePermission(canAccessRecord(ctx, { assignedTo: broadcast.createdBy }))

    // 4. Só cancela o que ainda está em andamento/agendado
    if (!CANCELLABLE_STATUSES.includes(broadcast.status)) {
      throw new Error('Este disparo não pode mais ser cancelado.')
    }

    // 5. Cancela e impede que recipients PENDING sejam pegos pelo worker.
    //    Mensagens já enviadas (SENT) permanecem intactas. Os PENDING que viram
    //    SKIPPED são somados ao contador denormalizado skippedCount.
    await db.$transaction(async (tx) => {
      const { count } = await tx.broadcastRecipient.updateMany({
        where: { broadcastId, status: BroadcastRecipientStatus.PENDING },
        data: { status: BroadcastRecipientStatus.SKIPPED },
      })
      await tx.broadcast.update({
        where: { id: broadcastId },
        data: {
          status: BroadcastStatus.CANCELLED,
          cancelledAt: new Date(),
          skippedCount: { increment: count },
        },
      })
    })

    // 6. Cancela a run durável (se houver) e libera a inbox para o próximo da fila.
    if (broadcast.triggerRunId) {
      await runs.cancel(broadcast.triggerRunId).catch(() => {})
    }
    await promoteNextQueuedForInbox(broadcast.inboxId)

    revalidateTag(`broadcasts:${ctx.orgId}`)
    revalidateTag(`broadcast:${broadcastId}`)

    return { success: true as const }
  })
