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

export async function handleNewDeal({
  orgId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const dealTitle = typeof resolved.dealTitle === 'string' ? resolved.dealTitle : null
  if (!dealTitle) return { status: 'IGNORED' }

  // Pipeline default com todos os estágios para suportar dealStageId mapeado
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

  // OWNER ativo é o assignee padrão
  const owner = await db.member.findFirst({
    where: { organizationId: orgId, role: 'OWNER', status: 'ACCEPTED' },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!owner?.userId) {
    return { status: 'ERROR', errorMessage: 'No active OWNER found for organization' }
  }

  // Resolve/cria contato se email fornecido — sem unique constraint, usa findFirst + create
  let contactId: string | null = null
  const email = typeof resolved.email === 'string' ? resolved.email : null

  if (email) {
    const existing = await db.contact.findFirst({
      where: { organizationId: orgId, email },
      select: { id: true },
    })

    if (existing) {
      contactId = existing.id
    } else {
      const created = await db.contact.create({
        data: {
          organizationId: orgId,
          email,
          name: typeof resolved.name === 'string' ? resolved.name : email,
          phone: typeof resolved.phone === 'string' ? resolved.phone : null,
          assignedTo: owner.userId,
        },
        select: { id: true },
      })
      contactId = created.id
    }
  }

  // Valor do deal — Decimal aceita string/number direto, mas parseamos para isolar lixo
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
      assignedTo: owner.userId,
      ...(dealValue ? { value: dealValue } : {}),
      ...(dealNotes ? { notes: dealNotes } : {}),
      ...(contactId
        ? { contacts: { create: { contactId, isPrimary: true } } }
        : {}),
    },
    select: { id: true },
  })

  return {
    status: 'PROCESSED',
    contactId: contactId ?? undefined,
    dealId: deal.id,
  }
}
