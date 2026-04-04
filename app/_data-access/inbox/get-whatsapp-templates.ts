import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getInboxMetaCredentials } from './get-inbox-meta-credentials'
import { fetchMetaTemplates } from '@/_lib/meta/template-api'
import type { MetaTemplate } from '@/_lib/meta/types'

const TEMPLATES_CACHE_TTL_SECONDS = 300 // 5 minutos — templates raramente mudam

async function fetchTemplatesFromApi(inboxId: string, orgId: string): Promise<MetaTemplate[]> {
  const credentials = await getInboxMetaCredentials(inboxId, orgId)
  if (!credentials) return []

  const response = await fetchMetaTemplates(credentials.wabaId, credentials.accessToken)
  return response.data
}

/**
 * Retorna todos os templates do inbox com cache de 5 minutos.
 * Tag: whatsapp-templates:${inboxId} — invalidada por create/delete/status-update.
 */
export const getWhatsAppTemplates = cache(async (
  inboxId: string,
  orgId: string,
): Promise<MetaTemplate[]> => {
  const getCached = unstable_cache(
    () => fetchTemplatesFromApi(inboxId, orgId),
    [`whatsapp-templates-${inboxId}`],
    {
      tags: [`whatsapp-templates:${inboxId}`],
      revalidate: TEMPLATES_CACHE_TTL_SECONDS,
    },
  )
  return getCached()
})
