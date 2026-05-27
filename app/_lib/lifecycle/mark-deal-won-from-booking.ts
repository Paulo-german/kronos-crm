import 'server-only'
import { after } from 'next/server'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ActivityType, LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'
import { advanceContactLifecycle } from './advance-contact-lifecycle'
import { ensureDealHasPrimaryCaptureEvent } from './ensure-deal-capture-event'
import { reactivateCustomerIfDormant } from './reactivate-customer-if-dormant'
import {
  collectSignalsForContact,
  toContactSignals,
} from '../../../trigger/lib/collect-health-signals'
import { computeHealthScore } from '../../../trigger/lib/compute-health-score'
import { persistOne } from '../../../trigger/lib/persist-health-score'
import { revalidateCopilotCache } from '@/_lib/revalidate-copilot-cache'

interface MarkDealWonFromBookingParams {
  dealId: string
  orgId: string
  causeUserId: string
}

/**
 * Marca um Deal como WON quando o BOOKING associado é concluído (status → COMPLETED).
 * Espelha a lógica de mark-deal-won sem o wrapper de safe-action (RBAC já feito em updateAppointment).
 * Cascade de lifecycle sempre corre — diferente de mark-deal-won que verifica facilitatorDealWonToCustomer,
 * aqui a entrega do serviço é gatilho explícito o suficiente para avançar o contato para CUSTOMER.
 */
export async function markDealWonFromBooking(params: MarkDealWonFromBookingParams): Promise<void> {
  const { dealId, orgId, causeUserId } = params

  await db.deal.update({
    where: { id: dealId },
    data: { status: 'WON' },
  })

  await db.activity.create({
    data: {
      type: ActivityType.deal_won,
      content: 'Serviço realizado — negociação marcada como GANHA',
      dealId,
      performedBy: causeUserId,
    },
  })

  revalidatePath('/crm/deals/pipeline')
  revalidatePath('/crm/deals/list')
  revalidatePath(`/crm/deals/${dealId}`)
  revalidateTag(`pipeline:${orgId}`)
  revalidateTag(`deals:${orgId}`)
  revalidateTag(`deals-options:${orgId}`)
  revalidateTag(`deal:${dealId}`)
  revalidateTag(`appointments:${orgId}`)
  revalidateTag(`dashboard:${orgId}`)
  revalidateTag(`dashboard-charts:${orgId}`)

  after(() =>
    evaluateAutomations({
      subjectKind: 'deal',
      orgId,
      triggerType: 'DEAL_STATUS_CHANGED',
      dealId,
      payload: { status: 'WON' },
    }),
  )

  after(async () => {
    try {
      const primaryContact = await db.dealContact.findFirst({
        where: { dealId, isPrimary: true },
        select: { contactId: true },
      })

      if (!primaryContact) return

      // lastInteractionAt antes do advanceContactLifecycle para que o sinal de recência
      // já esteja fresco quando o score for calculado ao final deste bloco.
      await db.contact.update({
        where: { id: primaryContact.contactId },
        data: { lastInteractionAt: new Date() },
      })
      await ensureDealHasPrimaryCaptureEvent({ dealId, organizationId: orgId })
      await advanceContactLifecycle({
        contactId: primaryContact.contactId,
        organizationId: orgId,
        toStage: LifecycleStage.CUSTOMER,
        causeType: LifecycleCauseType.DEAL_WON,
        causeRefId: dealId,
        changedByUserId: causeUserId,
        skipScoreUpdate: true,
      })
      await reactivateCustomerIfDormant({
        contactId: primaryContact.contactId,
        organizationId: orgId,
        causeRefId: dealId,
        changedByUserId: causeUserId,
      })

      // lifecycleStage vem de signals (já lido pelo SQL), sem query extra.
      const signals = await collectSignalsForContact(primaryContact.contactId, orgId)
      if (signals) {
        const result = computeHealthScore({
          contactId: primaryContact.contactId,
          organizationId: orgId,
          stage: signals.lifecycleStage,
          signals: toContactSignals(signals),
        })
        await persistOne(result)
        revalidateCopilotCache(orgId)
      }
    } catch (error) {
      console.warn('[markDealWonFromBooking] Falha no cascade de lifecycle:', {
        dealId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}
