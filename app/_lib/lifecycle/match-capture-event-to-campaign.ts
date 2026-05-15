import 'server-only'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'

// Open Decision #4 do PLAN base: utmCampaign pode ser ambíguo (ex: campanhas
// sazonais reutilizam o mesmo slug). Em vez de falhar a captura, logamos warning
// e atribuímos à campanha mais recente — admin tem visibilidade via console.
const AMBIGUITY_PROBE_LIMIT = 2

export async function matchCaptureEventToCampaign(
  captureEventId: string,
  orgId: string,
): Promise<void> {
  const event = await db.captureEvent.findUnique({
    where: { id: captureEventId },
    select: { utmCampaign: true, campaignId: true, organizationId: true },
  })

  if (!event || event.campaignId || !event.utmCampaign || event.organizationId !== orgId) return

  const campaigns = await db.campaign.findMany({
    where: { organizationId: orgId, utmCampaign: event.utmCampaign },
    orderBy: { createdAt: 'desc' },
    take: AMBIGUITY_PROBE_LIMIT,
    select: { id: true },
  })

  if (campaigns.length === 0) return

  if (campaigns.length > 1) {
    console.warn('[capture] Ambíguo: utmCampaign matched múltiplas campaigns', {
      utmCampaign: event.utmCampaign,
      orgId,
      count: campaigns.length,
    })
  }

  await db.captureEvent.update({
    where: { id: captureEventId },
    data: { campaignId: campaigns[0].id },
  })

  // Atribuição de campanha afeta dashboards e relatórios de origem — usa a mesma
  // tag do restante do lifecycle (ver revalidate-lifecycle-cache.ts).
  revalidateTag(`reports:${orgId}`)
  revalidateTag(`dashboard:${orgId}`)
}
