import 'server-only'

import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { ExecutorContext, ExecutorResult, UpdateDealPriorityConfig } from '../types'

/**
 * Executor que atualiza a prioridade de um deal — execução de sistema, sem RBAC.
 * Não executa quando o deal já possui a prioridade alvo.
 */
export async function executeUpdateDealPriority(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as UpdateDealPriorityConfig

  if (ctx.deal.priority === config.targetPriority) {
    return {
      summary: {
        skipped: true,
        reason: 'already_at_target_priority',
        priority: config.targetPriority,
      },
    }
  }

  const previousPriority = ctx.deal.priority

  await db.deal.update({
    where: { id: ctx.deal.id },
    data: { priority: config.targetPriority },
  })

  await db.activity.create({
    data: {
      type: 'priority_changed',
      content: `Prioridade alterada para ${config.targetPriority} pela automação "${ctx.automationName}"`,
      dealId: ctx.deal.id,
      performedBy: null,
      metadata: {
        source: 'automation',
        automationId: ctx.automationId,
        automationName: ctx.automationName,
        previousPriority,
        newPriority: config.targetPriority,
      },
    },
  })

  revalidatePath('/crm/deals/pipeline')
  revalidateTag(`deals:${ctx.orgId}`)
  revalidateTag(`deal:${ctx.deal.id}`)
  revalidateTag(`pipeline:${ctx.orgId}`)

  return { summary: { previousPriority, newPriority: config.targetPriority } }
}
