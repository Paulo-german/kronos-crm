import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getInboxMetaCredentials } from './get-inbox-meta-credentials'
import { fetchMetaTemplates } from '@/_lib/meta/template-api'
import type { MetaTemplate } from '@/_lib/meta/types'

const TEMPLATES_CACHE_TTL_SECONDS = 300 // 5 minutos

async function fetchApprovedTemplatesFromApi(inboxId: string, orgId: string): Promise<MetaTemplate[]> {
  const credentials = await getInboxMetaCredentials(inboxId, orgId)
  if (!credentials) return []

  // Filtrar no lado do Meta para evitar transferir templates nao aprovados
  const response = await fetchMetaTemplates(credentials.wabaId, credentials.accessToken, {
    status: 'APPROVED',
  })
  return response.data
}

/**
 * Versao otimizada que retorna somente templates APPROVED.
 * Usada pelo seletor de envio no chat — evita mostrar templates inutilizaveis.
 * Compartilha a mesma tag de cache: whatsapp-templates:${inboxId}.
 */
export const getApprovedTemplates = cache(async (
  inboxId: string,
  orgId: string,
): Promise<MetaTemplate[]> => {
  const getCached = unstable_cache(
    () => fetchApprovedTemplatesFromApi(inboxId, orgId),
    [`whatsapp-templates-approved-${inboxId}`],
    {
      tags: [`whatsapp-templates:${inboxId}`],
      revalidate: TEMPLATES_CACHE_TTL_SECONDS,
    },
  )
  return getCached()
})
