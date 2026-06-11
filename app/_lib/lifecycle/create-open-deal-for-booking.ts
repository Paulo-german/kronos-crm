import 'server-only'
import { LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { recalculateDealValue } from '@/_lib/deal-value'
import { advanceContactLifecycle } from './advance-contact-lifecycle'
import { ensureDealHasPrimaryCaptureEvent } from './ensure-deal-capture-event'

interface CreateOpenDealForBookingParams {
  appointmentId: string
  orgId: string
  assignedTo: string
  contactId: string
  serviceId: string
  serviceName: string
  priceSnapshot: number
  conversationId?: string
}

/**
 * Cria um Deal OPEN vinculado a um BOOKING no momento da criação do agendamento.
 * Avança o contato para OPPORTUNITY quando a org tem `facilitatorDealCreatedToOppty` ligada —
 * mesma semântica da criação manual de deal (create-deal/index.ts).
 * Idempotente por design: chamada com mesmo appointmentId após link já existir não chega aqui
 * (garantido pelo caller que verifica appointment.dealId).
 */
export async function createOpenDealForBooking(
  params: CreateOpenDealForBookingParams,
): Promise<{ dealId: string }> {
  const {
    appointmentId,
    orgId,
    assignedTo,
    contactId,
    serviceId,
    serviceName,
    priceSnapshot,
    conversationId,
  } = params

  const firstPipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
    select: {
      stages: {
        orderBy: { position: 'asc' },
        take: 1,
        select: { id: true },
      },
    },
  })

  const firstStage = firstPipeline?.stages[0]
  if (!firstStage) {
    throw new Error(
      'A organização não possui pipeline configurado. Crie um pipeline antes de criar um agendamento com negociação.',
    )
  }

  const deal = await db.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        title: `Agendamento — ${serviceName}`,
        organizationId: orgId,
        pipelineStageId: firstStage.id,
        assignedTo,
        status: 'OPEN',
        value: priceSnapshot,
      },
      select: { id: true },
    })

    await tx.dealContact.create({
      data: { dealId: created.id, contactId, isPrimary: true },
    })

    await tx.dealLineItem.create({
      data: {
        dealId: created.id,
        organizationId: orgId,
        itemType: 'SERVICE',
        recurrenceType: 'ONE_TIME',
        serviceId,
        unitPrice: priceSnapshot,
        quantity: 1,
        discountType: 'fixed',
        discountValue: 0,
      },
    })

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { dealId: created.id },
    })

    if (conversationId) {
      await tx.conversation.update({
        where: { id: conversationId },
        data: { dealId: created.id },
      })
    }

    return created
  })

  await recalculateDealValue(deal.id)

  // Avança o contato para OPPORTUNITY quando a org tem o facilitador ligado —
  // mesma semântica da criação manual de deal (create-deal/index.ts).
  // advanceContactLifecycle é monotônico: contatos já em OPPORTUNITY/CUSTOMER não regridem.
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { facilitatorDealCreatedToOppty: true },
  })

  if (org?.facilitatorDealCreatedToOppty) {
    await ensureDealHasPrimaryCaptureEvent({
      dealId: deal.id,
      organizationId: orgId,
    })
    await advanceContactLifecycle({
      contactId,
      organizationId: orgId,
      toStage: LifecycleStage.OPPORTUNITY,
      causeType: LifecycleCauseType.DEAL_CREATED,
      causeRefId: deal.id,
    })
  }

  return { dealId: deal.id }
}
