import 'server-only'
import { db } from '@/_lib/prisma'
import { recalculateDealValue } from '@/_lib/deal-value'

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
 * Não dispara cascade de lifecycle — auto-deals não avançam o estágio do contato.
 * Idempotente por design: chamada com mesmo appointmentId após link já existir não chega aqui
 * (garantido pelo caller que verifica appointment.dealId).
 */
export async function createOpenDealForBooking(
  params: CreateOpenDealForBookingParams,
): Promise<{ dealId: string }> {
  const { appointmentId, orgId, assignedTo, contactId, serviceId, serviceName, priceSnapshot, conversationId } = params

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

  return { dealId: deal.id }
}
