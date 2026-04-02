'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission, requireQuota, checkPlanQuota } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { createPipelineSchema } from './schema'

const PIPELINE_CREATION_WINDOW_MS = 12 * 60 * 60 * 1000 // 12 horas
const MAX_PIPELINES_PER_WINDOW = 10

export const createPipeline = orgActionClient
  .schema(createPipelineSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem criar pipelines)
    requirePermission(canPerformAction(ctx, 'pipeline', 'create'))

    // 2. Verificar quota do plano antes de qualquer operação no banco
    await requireQuota(ctx.orgId, 'pipeline')

    // 3. Rate limit: impede criação em massa — max 10 pipelines nas últimas 12h
    const windowStart = new Date(Date.now() - PIPELINE_CREATION_WINDOW_MS)
    const recentCount = await db.pipeline.count({
      where: {
        organizationId: ctx.orgId,
        createdAt: { gte: windowStart },
      },
    })

    if (recentCount >= MAX_PIPELINES_PER_WINDOW) {
      throw new Error('Limite de criação atingido. Aguarde algumas horas para criar novos funis.')
    }

    // 4. Verificar se é o primeiro pipeline da org para setar como default
    const existingCount = await db.pipeline.count({
      where: { organizationId: ctx.orgId },
    })
    const isFirstPipeline = existingCount === 0

    // 5. Criar o pipeline vazio — user configura as etapas na página de detalhe
    const pipeline = await db.pipeline.create({
      data: {
        name: data.name,
        organizationId: ctx.orgId,
        isDefault: isFirstPipeline,
      },
      select: { id: true },
    })

    // 6. Invalidar cache e retornar quota atualizada
    revalidateTag(`pipeline:${ctx.orgId}`)

    const quota = await checkPlanQuota(ctx.orgId, 'pipeline')

    return {
      success: true,
      pipelineId: pipeline.id,
      current: quota.current,
      limit: quota.limit,
    }
  })
