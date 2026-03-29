'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createActivitySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { findDealWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'

export const createActivity = orgActionClient
  .schema(createActivitySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Cria a atividade
    await db.activity.create({
      data: {
        type: data.type,
        content: data.content,
        dealId: data.dealId,
      },
    })

    revalidatePath('/crm/deals/pipeline')
    revalidatePath(`/crm/deals/${data.dealId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)

    // Fire-and-forget: automações não bloqueiam a resposta da action
    // stageId e pipelineId são resolvidos pelo motor via lazy-load do deal
    void evaluateAutomations({
      orgId: ctx.orgId,
      triggerType: 'ACTIVITY_CREATED',
      dealId: data.dealId,
      payload: { activityType: data.type },
    })

    return { success: true }
  })
