import 'server-only'

import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { ExecutorContext, ExecutorResult, MarkDealLostConfig } from '../types'

/**
 * Executor que marca um deal como LOST — execução de sistema, sem RBAC.
 * Não executa se o deal já estiver num estado final (WON, LOST).
 */
export async function executeMarkDealLost(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as MarkDealLostConfig

  // Previne marcar como LOST um deal que já encerrou
  if (ctx.deal.status === 'LOST' || ctx.deal.status === 'WON') {
    return {
      summary: {
        skipped: true,
        reason: 'already_closed',
        currentStatus: ctx.deal.status,
      },
    }
  }

  let reasonName: string | null = null
  if (config.lossReasonId) {
    const reason = await db.dealLostReason.findUnique({
      where: { id: config.lossReasonId },
      select: { name: true },
    })
    reasonName = reason?.name ?? null
  }

  await db.deal.update({
    where: { id: ctx.deal.id },
    data: {
      status: 'LOST',
      lossReasonId: config.lossReasonId ?? null,
    },
  })

  await db.activity.create({
    data: {
      type: 'deal_lost',
      content: reasonName
        ? `Deal marcado como PERDIDO pela automação "${ctx.automationName}". Motivo: ${reasonName}`
        : `Deal marcado como PERDIDO pela automação "${ctx.automationName}"`,
      dealId: ctx.deal.id,
      performedBy: null,
      metadata: {
        source: 'automation',
        automationId: ctx.automationId,
        automationName: ctx.automationName,
        lossReasonId: config.lossReasonId ?? null,
        lossReasonName: reasonName,
      },
    },
  })

  revalidatePath('/crm/deals/pipeline')
  revalidatePath('/crm/deals/list')
  revalidatePath(`/crm/deals/${ctx.deal.id}`)
  revalidateTag(`deals:${ctx.orgId}`)
  revalidateTag(`deal:${ctx.deal.id}`)
  revalidateTag(`pipeline:${ctx.orgId}`)
  revalidateTag(`dashboard:${ctx.orgId}`)
  revalidateTag(`dashboard-charts:${ctx.orgId}`)

  return { summary: { status: 'LOST', lossReasonId: config.lossReasonId ?? null } }
}
