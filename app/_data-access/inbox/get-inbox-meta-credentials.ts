import { db } from '@/_lib/prisma'
import type { InboxMetaCredentials } from '@/_lib/meta/types'

/**
 * Busca as credenciais Meta Cloud API de um inbox de forma segura.
 * Propositalmente NAO usa unstable_cache — accessToken é dado sensível
 * que não deve ser serializado no cache do Next.js.
 *
 * Valida que o inbox pertence à org antes de retornar as credenciais.
 */
export async function getInboxMetaCredentials(
  inboxId: string,
  orgId: string,
): Promise<InboxMetaCredentials | null> {
  const inbox = await db.inbox.findFirst({
    where: {
      id: inboxId,
      organizationId: orgId,
      connectionType: 'META_CLOUD',
    },
    select: {
      metaWabaId: true,
      metaAccessToken: true,
      metaPhoneNumberId: true,
    },
  })

  if (!inbox?.metaWabaId || !inbox.metaAccessToken || !inbox.metaPhoneNumberId) {
    return null
  }

  return {
    wabaId: inbox.metaWabaId,
    accessToken: inbox.metaAccessToken,
    phoneNumberId: inbox.metaPhoneNumberId,
  }
}
