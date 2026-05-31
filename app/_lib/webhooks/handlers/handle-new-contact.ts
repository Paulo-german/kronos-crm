import 'server-only'
import { CaptureChannel } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { resolveSquadMember } from '@/_lib/distribution/resolve-squad-member'
import { resolveCompanyId } from './resolve-company-id'
import { createContactPrivacy } from '@/_lib/privacy/create-contact-privacy'

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

// Contato criado via webhook nasce com base legal de legítimo interesse.
// Falha de privacy não deve derrubar o processamento do webhook.
async function createApiContactPrivacy(contactId: string): Promise<void> {
  try {
    await createContactPrivacy(db, {
      contactId,
      legalBasis: 'LEGITIMATE_INTEREST',
      legalBasisSource: 'API',
      performedBy: null,
    })
  } catch (error) {
    console.warn('[privacy] Falha ao criar ContactPrivacy para contato via webhook', error)
  }
}

export async function handleNewContact({
  orgId,
  squadId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const email = typeof resolved.email === 'string' ? resolved.email : null
  const phone = typeof resolved.phone === 'string' ? resolved.phone : null
  const name = typeof resolved.name === 'string' ? resolved.name : null
  const companyName =
    typeof resolved.companyName === 'string' ? resolved.companyName : null

  if (!email && !phone) {
    return { status: 'IGNORED' }
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
          ...(companyId ? { companyId } : {}),
        },
      })
      return { status: 'PROCESSED', contactId: existing.id, created: false }
    }

    const newContact = await db.contact.create({
      data: {
        organizationId: orgId,
        email,
        name: name ?? email,
        phone,
        companyId,
        assignedTo: assignedUserId,
        firstCaptureChannel: CaptureChannel.API,
        lastCaptureChannel: CaptureChannel.API,
      },
      select: { id: true },
    })
    await createApiContactPrivacy(newContact.id)
    return { status: 'PROCESSED', contactId: newContact.id, created: true }
  }

  // Sem email mas com phone — cria sempre (não há identidade estável sem email)
  const contact = await db.contact.create({
    data: {
      organizationId: orgId,
      name: name ?? phone!,
      phone,
      companyId,
      assignedTo: assignedUserId,
      firstCaptureChannel: CaptureChannel.API,
      lastCaptureChannel: CaptureChannel.API,
    },
    select: { id: true },
  })
  await createApiContactPrivacy(contact.id)
  return { status: 'PROCESSED', contactId: contact.id, created: true }
}
