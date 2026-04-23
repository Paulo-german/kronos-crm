'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { deletePipelineSchema } from './schema'

export const deletePipeline = orgActionClient
  .schema(deletePipelineSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'pipeline', 'delete'))

    // 2. Buscar o pipeline com contagem de deals via stages (validação de ownership inclusa)
    const pipeline = await db.pipeline.findFirst({
      where: { id: data.pipelineId, organizationId: ctx.orgId },
      include: {
        stages: {
          select: { _count: { select: { deals: true } } },
        },
      },
    })

    if (!pipeline) {
      throw new Error('Pipeline não encontrado.')
    }

    // 3. Bloquear exclusão quando o pipeline contém deals — user precisa movê-los manualmente
    const totalDeals = pipeline.stages.reduce((sum, stage) => sum + stage._count.deals, 0)
    if (totalDeals > 0) {
      throw new Error(
        'Não é possível excluir um funil com negócios. Mova os negócios antes de prosseguir.',
      )
    }

    // 4. Impedir exclusão do único pipeline da organização
    const totalPipelines = await db.pipeline.count({
      where: { organizationId: ctx.orgId },
    })

    if (totalPipelines === 1) {
      throw new Error('Não é possível excluir o único funil da organização.')
    }

    // 5. Pipeline default: exige seleção de novo default antes da exclusão
    if (pipeline.isDefault) {
      if (!data.newDefaultPipelineId) {
        throw new Error('Selecione um novo funil padrão antes de excluir.')
      }

      // Validar que o novo default pertence à mesma org e não é o pipeline sendo excluído
      const newDefault = await db.pipeline.findFirst({
        where: {
          id: data.newDefaultPipelineId,
          organizationId: ctx.orgId,
        },
        select: { id: true },
      })

      if (!newDefault) {
        throw new Error('Novo funil padrão não encontrado.')
      }

      if (data.newDefaultPipelineId === data.pipelineId) {
        throw new Error('O novo funil padrão não pode ser o mesmo que está sendo excluído.')
      }

      // Transação: promover novo default, limpar FKs órfãs e excluir o pipeline atual
      await db.$transaction([
        db.pipeline.update({
          where: { id: data.newDefaultPipelineId },
          data: { isDefault: true },
        }),
        db.inbox.updateMany({
          where: { organizationId: ctx.orgId, pipelineId: data.pipelineId },
          data: { pipelineId: null },
        }),
        db.$executeRaw`UPDATE agents SET pipeline_ids = array_remove(pipeline_ids, ${data.pipelineId}::uuid) WHERE organization_id = ${ctx.orgId}::uuid AND ${data.pipelineId}::uuid = ANY(pipeline_ids)`,
        db.pipeline.delete({ where: { id: data.pipelineId } }),
      ])
    } else {
      // Pipeline não-default: limpar FKs órfãs e excluir (cascade deleta stages)
      await db.$transaction([
        db.inbox.updateMany({
          where: { organizationId: ctx.orgId, pipelineId: data.pipelineId },
          data: { pipelineId: null },
        }),
        db.$executeRaw`UPDATE agents SET pipeline_ids = array_remove(pipeline_ids, ${data.pipelineId}::uuid) WHERE organization_id = ${ctx.orgId}::uuid AND ${data.pipelineId}::uuid = ANY(pipeline_ids)`,
        db.pipeline.delete({ where: { id: data.pipelineId } }),
      ])
    }

    // 6. Invalidar cache de pipeline, deals, inboxes e agentes
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })
