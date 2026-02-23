'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { markDealLostSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ActivityType } from '@prisma/client'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'

export const markDealLost = orgActionClient
  .schema(markDealLostSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Busca nome do motivo para log
    let reasonName = ''
    if (data.lossReasonId) {
      const reason = await db.dealLostReason.findUnique({
        where: { id: data.lossReasonId },
      })
      reasonName = reason?.name || ''
    }

    // 4. Atualiza status do deal para LOST
    await db.deal.update({
      where: { id: data.dealId },
      data: {
        status: 'LOST',
        lossReasonId: data.lossReasonId,
      },
    })

    await db.activity.create({
      data: {
        type: ActivityType.deal_lost,
        content: reasonName
          ? `Deal marcado como PERDIDO. Motivo: ${reasonName}`
          : 'Deal marcado como PERDIDO',
        dealId: data.dealId,
        performedBy: ctx.userId,
      },
    })

    // 5. Invalida paths e tags
    // Precisamos do slug para invalidar a rota de configurações (Client Router Cache)
    const org = await db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { slug: true },
    })

    if (org?.slug) {
      revalidatePath(`/org/${org.slug}/settings/loss-reasons`)
    }

    revalidatePath('/crm/deals/pipeline')
    revalidatePath('/crm/deals/list')
    revalidatePath(`/crm/deals/${data.dealId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)
    revalidateTag(`deal-lost-reasons:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidateTag(`dashboard-charts:${ctx.orgId}`)

    return { success: true }
  })
