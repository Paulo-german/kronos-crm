import { db } from '@/_lib/prisma'
import { resolveCompanyId } from './resolve-company-id'

interface HandlerInput {
  orgId: string
  resolved: Record<string, unknown>
}

interface ProcessResult {
  status: 'PROCESSED' | 'IGNORED' | 'ERROR'
  contactId?: string
  errorMessage?: string
}

export async function handleNewContact({
  orgId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const email = typeof resolved.email === 'string' ? resolved.email : null
  const phone = typeof resolved.phone === 'string' ? resolved.phone : null
  const name = typeof resolved.name === 'string' ? resolved.name : null
  const cpf = typeof resolved.cpf === 'string' ? resolved.cpf : null
  const companyName =
    typeof resolved.companyName === 'string' ? resolved.companyName : null

  if (!email && !phone) {
    return { status: 'IGNORED' }
  }

  // OWNER ativo é o assignee padrão para contatos vindos de webhook
  const owner = await db.member.findFirst({
    where: { organizationId: orgId, role: 'OWNER', status: 'ACCEPTED' },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!owner?.userId) {
    return { status: 'ERROR', errorMessage: 'No active OWNER found for organization' }
  }

  const companyId = await resolveCompanyId(orgId, companyName)

  // Sem unique constraint em (orgId, email): emula upsert com findFirst + update/create
  if (email) {
    const existing = await db.contact.findFirst({
      where: { organizationId: orgId, email },
      select: { id: true },
    })

    if (existing) {
      await db.contact.update({
        where: { id: existing.id },
        data: {
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(cpf ? { cpf } : {}),
          ...(companyId ? { companyId } : {}),
        },
      })
      return { status: 'PROCESSED', contactId: existing.id }
    }

    const created = await db.contact.create({
      data: {
        organizationId: orgId,
        email,
        name: name ?? email,
        phone,
        cpf,
        companyId,
        assignedTo: owner.userId,
      },
      select: { id: true },
    })
    return { status: 'PROCESSED', contactId: created.id }
  }

  // Sem email mas com phone — cria sempre (não há identidade estável sem email)
  const contact = await db.contact.create({
    data: {
      organizationId: orgId,
      name: name ?? phone!,
      phone,
      cpf,
      companyId,
      assignedTo: owner.userId,
    },
    select: { id: true },
  })
  return { status: 'PROCESSED', contactId: contact.id }
}
