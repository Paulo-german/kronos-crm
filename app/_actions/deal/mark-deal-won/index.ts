'use server'

import { after } from 'next/server'
import { orgActionClient } from '@/_lib/safe-action'
import { markDealWonSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ActivityType, LifecycleCauseType, LifecycleStage } from '@prisma/client'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'
import { advanceContactLifecycle } from '@/_lib/lifecycle/advance-contact-lifecycle'
import { ensureDealHasPrimaryCaptureEvent } from '@/_lib/lifecycle/ensure-deal-capture-event'

export const markDealWon = orgActionClient
  .schema(markDealWonSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Atualiza status do deal para WON
    await db.deal.update({
      where: { id: data.dealId },
      data: { status: 'WON' },
    })

    await db.activity.create({
      data: {
        type: ActivityType.deal_won,
        content: 'Deal marcado como GANHO',
        dealId: data.dealId,
        performedBy: ctx.userId,
      },
    })

    revalidatePath('/crm/deals/pipeline')
    revalidatePath('/crm/deals/list')
    revalidatePath(`/crm/deals/${data.dealId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidateTag(`dashboard-charts:${ctx.orgId}`)

    // Automações rodam depois da resposta mas dentro do contexto do request,
    // para que revalidateTag/revalidatePath dos executores funcionem corretamente
    after(() => evaluateAutomations({
      orgId: ctx.orgId,
      triggerType: 'DEAL_STATUS_CHANGED',
      dealId: data.dealId,
      payload: { status: 'WON' },
    }))

    after(async () => {
      const org = await db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { facilitatorDealWonToCustomer: true },
      })

      if (!org?.facilitatorDealWonToCustomer) return

      const primaryContact = await db.dealContact.findFirst({
        where: { dealId: data.dealId, isPrimary: true },
        select: { contactId: true },
      })

      if (!primaryContact) return

      await ensureDealHasPrimaryCaptureEvent({ dealId: data.dealId, organizationId: ctx.orgId })
      await advanceContactLifecycle({
        contactId: primaryContact.contactId,
        organizationId: ctx.orgId,
        toStage: LifecycleStage.CUSTOMER,
        causeType: LifecycleCauseType.DEAL_WON,
        causeRefId: data.dealId,
      })
    })

    return { success: true }
  })
