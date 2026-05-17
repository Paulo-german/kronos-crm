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
import { reactivateCustomerIfDormant } from '@/_lib/lifecycle/reactivate-customer-if-dormant'
import {
  collectSignalsForContact,
  toContactSignals,
} from '../../../../trigger/lib/collect-health-signals'
import { computeHealthScore } from '../../../../trigger/lib/compute-health-score'
import { persistOne } from '../../../../trigger/lib/persist-health-score'
import { revalidateCopilotCache } from '@/_lib/revalidate-copilot-cache'

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
      try {
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
          skipScoreUpdate: true,
        })
      } catch (error) {
        console.warn('[markDealWon] Falha no avanço de lifecycle:', {
          dealId: data.dealId,
          orgId: ctx.orgId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    after(async () => {
      try {
        const primaryContact = await db.dealContact.findFirst({
          where: { dealId: data.dealId, isPrimary: true },
          select: { contactId: true },
        })
        if (!primaryContact) return

        await reactivateCustomerIfDormant({
          contactId: primaryContact.contactId,
          organizationId: ctx.orgId,
          causeRefId: data.dealId,
          changedByUserId: ctx.userId,
        })
      } catch (error) {
        console.warn('[markDealWon] Falha na re-ativação de lifecycle:', {
          dealId: data.dealId,
          orgId: ctx.orgId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    // lastInteractionAt + health score num único after() — lastInteractionAt primeiro para que
    // o sinal de recência já esteja fresco quando collectSignalsForContact rodar.
    // lifecycleStage vem de signals (já lido pelo SQL), sem JOIN extra.
    after(async () => {
      try {
        const primaryContact = await db.dealContact.findFirst({
          where: { dealId: data.dealId, isPrimary: true },
          select: { contactId: true },
        })
        if (!primaryContact) return

        await db.contact.update({
          where: { id: primaryContact.contactId },
          data: { lastInteractionAt: new Date() },
        })

        const signals = await collectSignalsForContact(primaryContact.contactId, ctx.orgId)
        if (!signals) return

        const result = computeHealthScore({
          contactId: primaryContact.contactId,
          organizationId: ctx.orgId,
          stage: signals.lifecycleStage,
          signals: toContactSignals(signals),
        })
        await persistOne(result)
        revalidateCopilotCache(ctx.orgId)
      } catch (error) {
        console.warn('[markDealWon] Falha no recálculo de health score:', {
          dealId: data.dealId,
          orgId: ctx.orgId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    return { success: true }
  })
