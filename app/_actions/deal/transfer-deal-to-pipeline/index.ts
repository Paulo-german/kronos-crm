'use server'

import { after } from 'next/server'
import { orgActionClient } from '@/_lib/safe-action'
import { transferDealToPipelineSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'

export const transferDealToPipeline = orgActionClient
  .schema(transferDealToPipelineSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (mesmo nível de mover entre etapas)
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação de propriedade via RBAC
    const dealBase = await findDealWithRBAC(data.dealId, ctx)

    // 3. Buscar dados completos do deal (pipeline de origem)
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

    // 4. Validar que a etapa destino pertence ao pipeline destino E à organização
    const targetStage = await db.pipelineStage.findFirst({
      where: {
        id: data.targetStageId,
        pipelineId: data.targetPipelineId,
        pipeline: { organizationId: ctx.orgId },
      },
      include: {
        pipeline: true,
      },
    })

    if (!targetStage) {
      throw new Error('Etapa de destino inválida.')
    }

    // 5. No-op guard: já está no mesmo pipeline E na mesma etapa
    if (
      deal.stage.pipelineId === data.targetPipelineId &&
      deal.pipelineStageId === data.targetStageId
    ) {
      return { success: true, moved: false }
    }

    // 6. Atualizar o deal para a nova etapa (e pipeline implicitamente)
    await db.deal.update({
      where: { id: data.dealId },
      data: {
        pipelineStageId: data.targetStageId,
        ...(deal.status === 'OPEN' && { status: 'IN_PROGRESS' }),
      },
    })

    // 7. Registrar atividade de mudança de etapa com contexto de pipeline
    await db.activity.create({
      data: {
        type: 'stage_change',
        content: `${deal.stage.pipeline.name} / ${deal.stage.name} → ${targetStage.pipeline.name} / ${targetStage.name}`,
        dealId: data.dealId,
        performedBy: ctx.userId,
      },
    })

    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    // Automações rodam depois da resposta mas dentro do contexto do request,
    // para que revalidateTag/revalidatePath dos executores funcionem corretamente
    after(() =>
      evaluateAutomations({
        subjectKind: 'deal',
        orgId: ctx.orgId,
        triggerType: 'DEAL_MOVED',
        dealId: data.dealId,
        payload: {
          fromStageId: deal.pipelineStageId,
          toStageId: data.targetStageId,
          pipelineId: data.targetPipelineId,
        },
      }),
    )

    return { success: true, moved: true }
  })
