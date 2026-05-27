import 'server-only'
import { CaptureChannel } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { resolveSquadMember } from '@/_lib/distribution/resolve-squad-member'
import { resolveCompanyId } from './resolve-company-id'

interface HandlerInput {
  orgId: string
  squadId?: string | null
  resolved: Record<string, unknown>
}

interface ProcessResult {
  status: 'PROCESSED' | 'IGNORED' | 'ERROR'
  contactId?: string
  created?: boolean
  errorMessage?: string
}

export async function handleUpsertContact({
  orgId,
  squadId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const email = typeof resolved.email === 'string' ? resolved.email : null
  const phone = typeof resolved.phone === 'string' ? resolved.phone : null
  const name = typeof resolved.name === 'string' ? resolved.name : null
  const cpf = typeof resolved.cpf === 'string' ? resolved.cpf : null
  const companyName = typeof resolved.companyName === 'string' ? resolved.companyName : null

  if (!email && !phone) {
    return { status: 'IGNORED' }
  }

  const companyId = await resolveCompanyId(orgId, companyName)

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
      return { status: 'PROCESSED', contactId: existing.id, created: false }
    }
  }

  const squadResolution = await resolveSquadMember({ orgId, squadId })
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

  if (email) {
    const newContact = await db.contact.create({
      data: {
        organizationId: orgId,
        email,
        name: name ?? email,
        phone,
        cpf,
        companyId,
        assignedTo: assignedUserId,
        firstCaptureChannel: CaptureChannel.API,
        lastCaptureChannel: CaptureChannel.API,
      },
      select: { id: true },
    })
    return { status: 'PROCESSED', contactId: newContact.id, created: true }
  }

  // Sem email mas com phone — tenta deduplicar por telefone antes de criar
  const existingByPhone = await db.contact.findFirst({
    where: { organizationId: orgId, phone: phone! },
    select: { id: true },
  })

  if (existingByPhone) {
    await db.contact.update({
      where: { id: existingByPhone.id },
      data: {
        ...(name ? { name } : {}),
        ...(cpf ? { cpf } : {}),
        ...(companyId ? { companyId } : {}),
      },
    })
    return { status: 'PROCESSED', contactId: existingByPhone.id, created: false }
  }

  const contact = await db.contact.create({
    data: {
      organizationId: orgId,
      name: name ?? phone!,
      phone,
      cpf,
      companyId,
      assignedTo: assignedUserId,
      firstCaptureChannel: CaptureChannel.API,
      lastCaptureChannel: CaptureChannel.API,
    },
    select: { id: true },
  })
  return { status: 'PROCESSED', contactId: contact.id, created: true }
}
