import 'server-only'
import { db } from '@/_lib/prisma'
import type { Prisma, BroadcastRecipientStatus } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskPhone } from '@/_lib/pii-mask'

export interface BroadcastRecipientDto {
  id: string
  contactId: string
  contactName: string
  phoneSnapshot: string
  status: BroadcastRecipientStatus
  errorMessage: string | null
  attempts: number
  sentAt: Date | null
}

export interface BroadcastRecipientsParams {
  page: number
  pageSize: number
  status?: BroadcastRecipientStatus
}

export interface BroadcastRecipientsResult {
  data: BroadcastRecipientDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Paginação dos destinatários de um disparo.
 * Não cacheado: volume alto e muda durante o RUNNING.
 * RBAC aplicado via relation broadcast (org + ownership de MEMBER).
 */
export const getBroadcastRecipients = async (
  ctx: RBACContext,
  broadcastId: string,
  params: BroadcastRecipientsParams,
): Promise<BroadcastRecipientsResult> => {
  const elevated = isElevated(ctx.userRole)
  // PII: MEMBER vê telefone mascarado quando a org esconde PII (igual a get-contacts)
  const masked = !elevated && (ctx.hidePiiFromMembers ?? false)

  const where: Prisma.BroadcastRecipientWhereInput = {
    broadcastId,
    // RBAC pela relation: garante org e, para MEMBER, ownership do disparo
    broadcast: {
      organizationId: ctx.orgId,
      ...(elevated ? {} : { createdBy: ctx.userId }),
    },
    ...(params.status ? { status: params.status } : {}),
  }

  const [total, recipients] = await Promise.all([
    db.broadcastRecipient.count({ where }),
    db.broadcastRecipient.findMany({
      where,
      select: {
        id: true,
        contactId: true,
        phoneSnapshot: true,
        status: true,
        errorMessage: true,
        attempts: true,
        sentAt: true,
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])

  return {
    data: recipients.map((recipient) => ({
      id: recipient.id,
      contactId: recipient.contactId,
      contactName: recipient.contact.name,
      phoneSnapshot: masked
        ? (maskPhone(recipient.phoneSnapshot) ?? '')
        : recipient.phoneSnapshot,
      status: recipient.status,
      errorMessage: recipient.errorMessage,
      attempts: recipient.attempts,
      sentAt: recipient.sentAt,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  }
}
