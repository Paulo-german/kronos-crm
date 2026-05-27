import 'server-only'
import { after } from 'next/server'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ActivityType } from '@prisma/client'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'

interface MarkDealLostFromBookingParams {
  dealId: string
  orgId: string
  causeUserId: string
  reason: 'CANCELED' | 'NO_SHOW'
}

/**
 * Marca um Deal como LOST quando o BOOKING associado é cancelado ou não comparecido.
 * Espelha a lógica de mark-deal-lost sem o wrapper de safe-action.
 * Sem cascade de lifecycle — LOST não avança o contato (espelho de mark-deal-lost existente).
 */
export async function markDealLostFromBooking(params: MarkDealLostFromBookingParams): Promise<void> {
  const { dealId, orgId, causeUserId, reason } = params

  const content =
    reason === 'NO_SHOW'
      ? 'Cliente não compareceu — negociação marcada como PERDIDA'
      : 'Agendamento cancelado — negociação marcada como PERDIDA'

  await db.deal.update({
    where: { id: dealId },
    data: { status: 'LOST' },
  })

  await db.activity.create({
    data: {
      type: ActivityType.deal_lost,
      content,
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
      payload: { status: 'LOST' },
    }),
  )
}
