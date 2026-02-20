'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { moveDealToStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'

export const moveDealToStage = orgActionClient
  .schema(moveDealToStageSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    const dealBase = await findDealWithRBAC(data.dealId, ctx)

    // 3. Buscar dados completos do deal para o resto da operação
    const deal = await db.deal.findFirst({
      where: { id: dealBase.id },
      include: {
        stage: {
          include: {
            pipeline: true,
          },
        },
      },
    })

    if (!deal) {
      throw new Error('Negócio não encontrado.')
    }

    // Verifica se a nova etapa pertence ao mesmo pipeline
    const newStage = await db.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipelineId: deal.stage.pipelineId,
      },
    })

    if (!newStage) {
      throw new Error('Etapa não pertence a este pipeline.')
    }

    // Se já está na mesma etapa, não faz nada
    if (deal.pipelineStageId === data.stageId) {
      return { success: true, moved: false }
    }

    await db.deal.update({
      where: { id: data.dealId },
      data: {
        pipelineStageId: data.stageId,
        ...(deal.status === 'OPEN' && { status: 'IN_PROGRESS' }),
      },
    })

    await db.activity.create({
      data: {
        type: 'stage_change',
        content: `${deal.stage.name} → ${newStage.name}`,
        dealId: data.dealId,
        performedBy: ctx.userId,
      },
    })

    revalidatePath('/crm/pipeline')
    revalidatePath(`/crm/pipeline/deal/${data.dealId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)

    return { success: true, moved: true }
  })
