import { db } from '@/_lib/prisma'

interface HandlerInput {
  orgId: string
  resolved: Record<string, unknown>
}

interface ProcessResult {
  status: 'PROCESSED' | 'IGNORED' | 'ERROR'
  contactId?: string
  dealId?: string
  errorMessage?: string
}

export async function handleDealClosed({
  orgId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const dealTitle = typeof resolved.dealTitle === 'string' ? resolved.dealTitle : null
  if (!dealTitle) return { status: 'IGNORED' }

  let contactId: string | null = null
  const email = typeof resolved.email === 'string' ? resolved.email : null
  if (email) {
    const contact = await db.contact.findFirst({
      where: { organizationId: orgId, email },
      select: { id: true },
    })
    contactId = contact?.id ?? null
  }

  const deal = await db.deal.findFirst({
    where: {
      organizationId: orgId,
      title: dealTitle,
      ...(contactId ? { contacts: { some: { contactId } } } : {}),
    },
    select: {
      id: true,
      stage: { select: { pipelineId: true } },
      contacts: { select: { contactId: true, isPrimary: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!deal) return { status: 'IGNORED' }

  const lastStage = await db.pipelineStage.findFirst({
    where: { pipelineId: deal.stage.pipelineId },
    orderBy: { position: 'desc' },
    select: { id: true },
  })

  if (!lastStage) return { status: 'ERROR', errorMessage: 'No stages found for pipeline' }

  await db.deal.update({
    where: { id: deal.id },
    data: { pipelineStageId: lastStage.id, status: 'WON' },
  })

  const primaryContact =
    deal.contacts.find((dealContact) => dealContact.isPrimary) ?? deal.contacts[0]

  return {
    status: 'PROCESSED',
    contactId: primaryContact?.contactId,
    dealId: deal.id,
  }
}
