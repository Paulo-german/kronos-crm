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

export async function handleUpdateContact({
  orgId,
  resolved,
}: HandlerInput): Promise<ProcessResult> {
  const email = typeof resolved.email === 'string' ? resolved.email : null

  if (!email) return { status: 'IGNORED' }

  const contact = await db.contact.findFirst({
    where: { organizationId: orgId, email },
    select: { id: true },
  })

  if (!contact) return { status: 'IGNORED' }

  const updateData: Record<string, unknown> = {}
  if (typeof resolved.name === 'string') updateData.name = resolved.name
  if (typeof resolved.phone === 'string') updateData.phone = resolved.phone

  if (typeof resolved.companyName === 'string') {
    const companyId = await resolveCompanyId(orgId, resolved.companyName)
    if (companyId) updateData.companyId = companyId
  }

  if (Object.keys(updateData).length === 0) return { status: 'IGNORED' }

  await db.contact.update({
    where: { id: contact.id },
    data: updateData,
  })

  return { status: 'PROCESSED', contactId: contact.id }
}
