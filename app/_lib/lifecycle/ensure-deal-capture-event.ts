import { db } from '@/_lib/prisma'

interface EnsureCaptureEventParams {
  dealId: string
  organizationId: string
  captureSourceId?: string
}

/**
 * Garante que o Deal possui ao menos um CaptureEvent com attribution=PRIMARY.
 * Resolve o CaptureSource via parâmetro ou via conversation.inbox.captureSourceId.
 * Cria CaptureEvent + DealCaptureEvent (PRIMARY) se não existir ainda.
 */
export async function ensureDealHasPrimaryCaptureEvent(
  params: EnsureCaptureEventParams,
): Promise<void> {
  const { dealId, organizationId, captureSourceId } = params

  const existing = await db.dealCaptureEvent.findFirst({
    where: { dealId, attribution: 'PRIMARY' },
    select: { id: true },
  })

  if (existing) return

  // Resolve CaptureSource: usa o fornecido, ou infere via conversation → inbox
  let resolvedCaptureSourceId = captureSourceId

  if (!resolvedCaptureSourceId) {
    const conversation = await db.conversation.findFirst({
      where: { dealId },
      select: { inbox: { select: { captureSourceId: true } } },
    })
    resolvedCaptureSourceId = conversation?.inbox.captureSourceId ?? undefined
  }

  if (!resolvedCaptureSourceId) return

  // CaptureEvent exige contactId e channel — derivar do contato primário do deal e do CaptureSource
  const [primaryContact, source] = await Promise.all([
    db.dealContact.findFirst({
      where: { dealId, isPrimary: true },
      select: { contactId: true },
    }),
    db.captureSource.findUnique({
      where: { id: resolvedCaptureSourceId },
      select: { channel: true },
    }),
  ])

  if (!primaryContact || !source) return

  const captureEvent = await db.captureEvent.create({
    data: {
      organizationId,
      contactId: primaryContact.contactId,
      channel: source.channel,
      sourceId: resolvedCaptureSourceId,
      capturedAutomatically: true,
    },
  })

  await db.dealCaptureEvent.create({
    data: {
      dealId,
      captureEventId: captureEvent.id,
      attribution: 'PRIMARY',
    },
  })
}
