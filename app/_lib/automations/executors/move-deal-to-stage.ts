import 'server-only'

import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { ExecutorContext, ExecutorResult, MoveDealToStageConfig } from '../types'

/**
 * Executor de movimentação de estágio sem RBAC — execução de sistema.
 * Valida que o stage alvo pertence ao mesmo pipeline do deal antes de mover.
 */
export async function executeMoveDealToStage(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as MoveDealToStageConfig

  // Verifica que o stage alvo existe e pertence ao pipeline do deal
  const targetStage = await db.pipelineStage.findFirst({
    where: {
      id: config.targetStageId,
      pipelineId: ctx.deal.pipelineId,
    },
    select: { id: true, name: true },
  })

  if (!targetStage) {
    throw new Error(
      `Stage alvo ${config.targetStageId} não encontrado no pipeline ${ctx.deal.pipelineId}`,
    )
  }

  // Sem mudança real: deal já está no stage alvo
  if (ctx.deal.stageId === config.targetStageId) {
    return { summary: { skipped: true, reason: 'already_in_stage', stageId: config.targetStageId } }
  }

  // Busca nome do stage atual para o log
  const currentStage = await db.pipelineStage.findUnique({
    where: { id: ctx.deal.stageId },
    select: { name: true },
  })

  await db.deal.update({
    where: { id: ctx.deal.id },
    data: {
      pipelineStageId: config.targetStageId,
      // Deals OPEN são promovidos para IN_PROGRESS na primeira movimentação
      ...(ctx.deal.status === 'OPEN' ? { status: 'IN_PROGRESS' } : {}),
    },
  })

  await db.activity.create({
    data: {
      type: 'stage_change',
      content: `${currentStage?.name ?? ctx.deal.stageId} → ${targetStage.name} (automação)`,
      dealId: ctx.deal.id,
      performedBy: null,
      metadata: {
        source: 'automation',
        automationId: ctx.automationId,
        automationName: ctx.automationName,
        fromStageId: ctx.deal.stageId,
        toStageId: config.targetStageId,
      },
    },
  })

  revalidatePath('/crm/deals/pipeline')
  revalidatePath('/crm/deals/list')
  revalidatePath(`/crm/deals/${ctx.deal.id}`)
  revalidateTag(`deals:${ctx.orgId}`)
  revalidateTag(`deal:${ctx.deal.id}`)
  revalidateTag(`pipeline:${ctx.orgId}`)

  return { summary: { fromStageId: ctx.deal.stageId, toStageId: config.targetStageId } }
}
