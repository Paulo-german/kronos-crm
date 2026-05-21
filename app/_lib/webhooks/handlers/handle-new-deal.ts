import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'
import { resolveSquadMember } from '@/_lib/distribution/resolve-squad-member'

interface HandlerInput {
  orgId: string
  squadId?: string | null
  resolved: Record<string, unknown>
}

interface ProcessResult {
  status: 'PROCESSED' | 'IGNORED' | 'ERROR'
  contactId?: string
  dealId?: string
  errorMessage?: string
}

export async function handleNewDeal({
  orgId,
  squadId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const dealTitle = typeof resolved.dealTitle === 'string' ? resolved.dealTitle : null
  if (!dealTitle) return { status: 'IGNORED' }

  const pipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId, isDefault: true },
    include: { stages: { orderBy: { position: 'asc' } } },
  })

  if (!pipeline || pipeline.stages.length === 0) {
    return { status: 'ERROR', errorMessage: 'No default pipeline or stages found' }
  }

  const resolvedStageId = typeof resolved.dealStageId === 'string' ? resolved.dealStageId : null
  const targetStage =
    (resolvedStageId ? pipeline.stages.find((stage) => stage.id === resolvedStageId) : null) ??
    pipeline.stages[0]

  const email = typeof resolved.email === 'string' ? resolved.email : null

  // Busca contato existente para aplicar LOYALTY corretamente
  let contactId: string | null = null
  let contactCurrentAssignedTo: string | null = null

  if (email) {
    const existing = await db.contact.findFirst({
      where: { organizationId: orgId, email },
      select: { id: true, assignedTo: true },
    })

    if (existing) {
      contactId = existing.id
      contactCurrentAssignedTo = existing.assignedTo
    }
  }

  // Resolve assignee via squad — fallback para OWNER se nenhum squad configurado
  const squadResolution = await resolveSquadMember({ orgId, squadId, contactCurrentAssignedTo })

  const resolvedSquadId = squadResolution?.squadId ?? null
  let assignedUserId = squadResolution?.userId ?? null

  if (!assignedUserId) {
    const owner = await db.member.findFirst({
      where: { organizationId: orgId, role: 'OWNER', status: 'ACCEPTED' },
      select: { userId: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!owner?.userId) {
      return { status: 'ERROR', errorMessage: 'No active OWNER found for organization' }
    }

    assignedUserId = owner.userId
  }

  // Cria contato se email fornecido e ainda não existe
  if (email && !contactId) {
    const created = await db.contact.create({
      data: {
        organizationId: orgId,
        email,
        name: typeof resolved.name === 'string' ? resolved.name : email,
        phone: typeof resolved.phone === 'string' ? resolved.phone : null,
        assignedTo: assignedUserId,
      },
      select: { id: true },
    })
    contactId = created.id
  }

  let dealValue: Prisma.Decimal | null = null
  const rawValue = resolved.dealValue
  if (rawValue !== null && rawValue !== undefined) {
    const parsed = parseFloat(String(rawValue))
    if (!Number.isNaN(parsed)) dealValue = new Prisma.Decimal(parsed)
  }

  const dealNotes = typeof resolved.dealNotes === 'string' ? resolved.dealNotes : null

  const deal = await db.deal.create({
    data: {
      organizationId: orgId,
      title: dealTitle,
      pipelineStageId: targetStage.id,
      assignedTo: assignedUserId,
      ...(resolvedSquadId ? { squadId: resolvedSquadId } : {}),
      ...(dealValue ? { value: dealValue } : {}),
      ...(dealNotes ? { notes: dealNotes } : {}),
      ...(contactId ? { contacts: { create: { contactId, isPrimary: true } } } : {}),
    },
    select: { id: true },
  })

  return {
    status: 'PROCESSED',
    contactId: contactId ?? undefined,
    dealId: deal.id,
  }
}
