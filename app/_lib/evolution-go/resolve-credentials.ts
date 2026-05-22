import 'server-only'
import { cache } from 'react'
import { db } from '@/_lib/prisma'
import type { EvolutionGoCredentials } from './types'

/**
 * Evolution Go é sempre selfhosted no MVP — não há fallback para env vars globais.
 * Sempre lê `evolutionApiUrl` + `evolutionApiKey` (reusados para o token Go) do Inbox.
 */
function buildCredentialsFromInbox(
  evolutionApiUrl: string | null,
  evolutionApiKey: string | null,
): EvolutionGoCredentials {
  if (!evolutionApiUrl || !evolutionApiKey) {
    throw new Error(
      'Evolution Go não configurado: apiUrl e apiToken são obrigatórios no inbox.',
    )
  }

  return { apiUrl: evolutionApiUrl, apiToken: evolutionApiKey }
}

/**
 * Resolve credenciais Evolution Go para um inbox específico.
 * Envolto com cache() do React para dedup intra-request (query ultra-leve por PK).
 */
export const resolveEvolutionGoCredentials = cache(
  async (inboxId: string): Promise<EvolutionGoCredentials> => {
    const inbox = await db.inbox.findUnique({
      where: { id: inboxId },
      select: { evolutionApiUrl: true, evolutionApiKey: true },
    })

    if (!inbox) {
      throw new Error(`Inbox não encontrado: ${inboxId}`)
    }

    return buildCredentialsFromInbox(inbox.evolutionApiUrl, inbox.evolutionApiKey)
  },
)

/**
 * Resolve credenciais Evolution Go a partir do instanceName (usado pelo webhook Go).
 */
export async function resolveEvolutionGoCredentialsByInstanceName(
  instanceName: string,
): Promise<EvolutionGoCredentials> {
  const inbox = await db.inbox.findFirst({
    where: { evolutionInstanceName: instanceName, connectionType: 'EVOLUTION_GO' },
    select: { evolutionApiUrl: true, evolutionApiKey: true },
  })

  if (!inbox) {
    throw new Error(
      `Inbox Evolution Go não encontrado para instanceName: ${instanceName}`,
    )
  }

  return buildCredentialsFromInbox(inbox.evolutionApiUrl, inbox.evolutionApiKey)
}

/**
 * Busca o webhook secret do inbox Evolution Go pelo instanceName.
 * Go é sempre selfhosted — sem fallback global.
 */
export async function resolveEvolutionGoWebhookSecretByInstanceName(
  instanceName: string,
): Promise<string | null> {
  const inbox = await db.inbox.findFirst({
    where: { evolutionInstanceName: instanceName, connectionType: 'EVOLUTION_GO' },
    select: { evolutionWebhookSecret: true },
  })

  return inbox?.evolutionWebhookSecret ?? null
}
