import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { CaptureChannel, LifecycleStage, type Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated, type RBACContext } from '@/_lib/rbac'
import {
  ATTENTION_CARD_LIMIT,
  DASHBOARD_V2_CACHE_REVALIDATE_S,
  LEAD_WAITING_DAYS,
} from '@/_lib/lifecycle/dashboard-v2-constants'
import { buildContactWhereForDashboardV2 } from './shared/build-contact-where'
import { makeDashboardV2CacheKey } from './shared/dashboard-v2-cache'
import type { AttentionContactDto, AttentionListDto } from './shared/attention-types'

// Labels PT-BR para o canal de captura no secondary metric
const CAPTURE_CHANNEL_LABELS: Record<CaptureChannel, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  WEBSITE_CHAT: 'Chat do Site',
  EMBED_FORM: 'Formulário',
  FACEBOOK_LEAD: 'Facebook Lead',
  API: 'API',
  PHONE_CALL: 'Ligação',
  IN_PERSON: 'Presencial',
  EVENT: 'Evento',
  EMAIL: 'E-mail',
  REFERRAL: 'Indicação',
  IMPORT: 'Importação',
  UNKNOWN: 'Origem desconhecida',
}

// Acima deste número de dias o card escala de "warning" para "destructive"
const DESTRUCTIVE_WAITING_DAYS = 10

const MS_PER_DAY = 1000 * 60 * 60 * 24

async function fetchWaitingLeads(
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<AttentionListDto> {
  const now = new Date()
  const leadWaitingThreshold = new Date()
  leadWaitingThreshold.setDate(leadWaitingThreshold.getDate() - LEAD_WAITING_DAYS)

  const contactWhere = buildContactWhereForDashboardV2(orgId, userId, elevated, {
    lifecycleStage: LifecycleStage.LEAD,
  })

  // `firstCaptureAt: { lt: threshold }` exclui automaticamente registros NULL —
  // sem `firstCaptureAt` não é possível calcular há quanto tempo o lead aguarda.
  const waitingWhere: Prisma.ContactWhereInput = {
    firstCaptureAt: { lt: leadWaitingThreshold },
  }

  const finalWhere: Prisma.ContactWhereInput = { ...contactWhere, ...waitingWhere }

  const [rawContacts, totalCount] = await Promise.all([
    db.contact.findMany({
      where: finalWhere,
      select: {
        id: true,
        name: true,
        firstCaptureAt: true,
        firstCaptureChannel: true,
      },
      orderBy: { firstCaptureAt: 'asc' },
      take: ATTENTION_CARD_LIMIT,
    }),
    db.contact.count({ where: finalWhere }),
  ])

  const contacts: AttentionContactDto[] = rawContacts.map((contact) => {
    // `firstCaptureAt` é não-nulo aqui por causa do where `{ lt: threshold }`,
    // mas o tipo Prisma ainda considera nullable — guard para satisfazer narrowing.
    const captureDate = contact.firstCaptureAt
    if (!captureDate) {
      return {
        contactId: contact.id,
        contactName: contact.name,
        contactAvatarUrl: null,
        primaryMetric: '— dias aguardando',
        primaryMetricVariant: 'warning',
        secondaryMetric: contact.firstCaptureChannel
          ? CAPTURE_CHANNEL_LABELS[contact.firstCaptureChannel]
          : null,
      }
    }

    const diffDays = Math.floor((now.getTime() - captureDate.getTime()) / MS_PER_DAY)
    const variant: AttentionContactDto['primaryMetricVariant'] =
      diffDays >= DESTRUCTIVE_WAITING_DAYS ? 'destructive' : 'warning'

    return {
      contactId: contact.id,
      contactName: contact.name,
      contactAvatarUrl: null,
      primaryMetric: `${diffDays} dias aguardando`,
      primaryMetricVariant: variant,
      secondaryMetric: contact.firstCaptureChannel
        ? CAPTURE_CHANNEL_LABELS[contact.firstCaptureChannel]
        : null,
    }
  })

  return { contacts, totalCount }
}

export const getWaitingLeads = cache(
  async (ctx: RBACContext): Promise<AttentionListDto> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () => fetchWaitingLeads(ctx.orgId, ctx.userId, elevated),
      makeDashboardV2CacheKey('waiting-leads', ctx),
      {
        tags: [`dashboard:${ctx.orgId}`, `contacts:${ctx.orgId}`],
        revalidate: DASHBOARD_V2_CACHE_REVALIDATE_S,
      },
    )
    return getCached()
  },
)
