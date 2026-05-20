import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'

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

export async function handleUpdateDeal({
  orgId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const dealTitle = typeof resolved.dealTitle === 'string' ? resolved.dealTitle : null
  if (!dealTitle) return { status: 'IGNORED' }

  // Tenta encontrar contato pelo email (para narrowing do deal)
  let contactId: string | null = null
  const email = typeof resolved.email === 'string' ? resolved.email : null
  if (email) {
    const contact = await db.contact.findFirst({
      where: { organizationId: orgId, email },
      select: { id: true },
    })
    contactId = contact?.id ?? null
  }

  // Filtra deal por título + (se disponível) contato vinculado via DealContact
  const deal = await db.deal.findFirst({
    where: {
      organizationId: orgId,
      title: dealTitle,
      ...(contactId ? { contacts: { some: { contactId } } } : {}),
    },
    select: {
      id: true,
      contacts: { select: { contactId: true, isPrimary: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!deal) return { status: 'IGNORED' }

  const updateData: Record<string, unknown> = {}
  if (typeof resolved.dealNotes === 'string') updateData.notes = resolved.dealNotes
  if (typeof resolved.dealStageId === 'string') {
    updateData.pipelineStageId = resolved.dealStageId
  }

  const rawValue = resolved.dealValue
  if (rawValue !== null && rawValue !== undefined) {
    const parsed = parseFloat(String(rawValue))
    if (!Number.isNaN(parsed)) updateData.value = new Prisma.Decimal(parsed)
  }

  if (Object.keys(updateData).length === 0) return { status: 'IGNORED' }

  await db.deal.update({ where: { id: deal.id }, data: updateData })

  const primaryContact =
    deal.contacts.find((dealContact) => dealContact.isPrimary) ?? deal.contacts[0]

  return {
    status: 'PROCESSED',
    contactId: primaryContact?.contactId,
    dealId: deal.id,
  }
}
