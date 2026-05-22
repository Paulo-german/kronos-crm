import 'server-only'
import { cache } from 'react'
import { db } from '@/_lib/prisma'

export interface EvolutionCredentials {
  apiUrl: string
  apiKey: string
  isSelfHosted: boolean
}

function resolveGlobalCredentials(): EvolutionCredentials {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

  return { apiUrl, apiKey, isSelfHosted: false }
}

function buildCredentialsFromInbox(
  evolutionApiUrl: string | null,
  evolutionApiKey: string | null,
): EvolutionCredentials {
  // Ambos preenchidos — self-hosted
  if (evolutionApiUrl && evolutionApiKey) {
    return { apiUrl: evolutionApiUrl, apiKey: evolutionApiKey, isSelfHosted: true }
  }

  // Ambos null — usar env vars globais (instância Kronos)
  if (!evolutionApiUrl && !evolutionApiKey) {
    return resolveGlobalCredentials()
  }

  // Estado inválido: um campo preenchido, outro vazio
  throw new Error(
    'Configuração Evolution inválida: evolutionApiUrl e evolutionApiKey devem ser preenchidos juntos.',
  )
}

/**
 * Resolve credenciais Evolution para um inbox específico.
 * Prioriza credenciais self-hosted do inbox (BYOI) sobre as env vars globais.
 * Envolto com cache() do React para dedup intra-request (query ultra-leve por PK).
 */
export const resolveEvolutionCredentials = cache(
  async (inboxId: string): Promise<EvolutionCredentials> => {
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
 * Resolve credenciais Evolution a partir do instanceName (usado pelo webhook).
 * O webhook recebe instanceName, não inboxId.
 */
export async function resolveEvolutionCredentialsByInstanceName(
  instanceName: string,
): Promise<EvolutionCredentials> {
  const inbox = await db.inbox.findFirst({
    where: { evolutionInstanceName: instanceName },
    select: { evolutionApiUrl: true, evolutionApiKey: true },
  })

  if (!inbox) {
    // Inbox não encontrado — fallback para credenciais globais
    return resolveGlobalCredentials()
  }

  return buildCredentialsFromInbox(inbox.evolutionApiUrl, inbox.evolutionApiKey)
}

/**
 * Busca o webhook secret do inbox pelo instanceName.
 * Retorna null se o inbox não tiver secret per-inbox (usa o secret global).
 */
export async function resolveWebhookSecretByInstanceName(
  instanceName: string,
): Promise<string | null> {
  const inbox = await db.inbox.findFirst({
    where: { evolutionInstanceName: instanceName },
    select: { evolutionWebhookSecret: true },
  })

  return inbox?.evolutionWebhookSecret ?? null
}
