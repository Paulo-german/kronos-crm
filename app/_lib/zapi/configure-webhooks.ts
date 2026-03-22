import { zapiPost, zapiPut } from './zapi-client'
import type { ZApiConfig } from './types'

const PRODUCTION_URL = 'https://app.kronoshub.com.br'

function resolveAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL
}

/**
 * Monta a webhook URL completa para o endpoint Z-API.
 */
export function buildZApiWebhookUrl(): string {
  const appUrl = resolveAppUrl()
  const secret = process.env.ZAPI_WEBHOOK_SECRET
  return secret
    ? `${appUrl}/api/webhooks/zapi?secret=${secret}`
    : `${appUrl}/api/webhooks/zapi`
}

/**
 * Tenta configurar um webhook via POST, e se retornar 405 tenta PUT.
 * A Z-API é inconsistente entre endpoints — received aceita PUT, send aceita POST.
 */
async function setWebhook(
  config: ZApiConfig,
  endpoint: string,
  webhookUrl: string,
): Promise<boolean> {
  try {
    const postResponse = await zapiPost(config, endpoint, { value: webhookUrl })
    if (postResponse.ok) return true

    // Se POST retornou 405 (Method Not Allowed), tenta PUT
    if (postResponse.status === 405) {
      const putResponse = await zapiPut(config, endpoint, { value: webhookUrl })
      return putResponse.ok
    }

    console.error(`[zapi] Failed to configure ${endpoint}: HTTP ${postResponse.status}`)
    return false
  } catch (error) {
    console.error(`[zapi] Failed to configure ${endpoint}:`, error)
    return false
  }
}

interface ConfigureWebhooksResult {
  receivedConfigured: boolean
  sendConfigured: boolean
  webhookUrl: string
}

/**
 * Ativa "notificar enviadas por mim" via PUT.
 * Necessario para que mensagens enviadas pelo celular aparecam no webhook.
 */
async function enableNotifySentByMe(config: ZApiConfig): Promise<boolean> {
  try {
    const response = await zapiPut(config, 'update-notify-sent-by-me', {
      notifySentByMe: true,
    })
    return response.ok
  } catch (error) {
    console.error('[zapi] Failed to enable notifySentByMe:', error)
    return false
  }
}

/**
 * Configura os webhooks de recebimento e envio na Z-API automaticamente.
 * Tambem ativa "notificar enviadas por mim" para capturar mensagens fromMe.
 * Nunca lanca erro — retorna status de cada webhook.
 */
export async function configureZApiWebhooks(
  config: ZApiConfig,
): Promise<ConfigureWebhooksResult> {
  const webhookUrl = buildZApiWebhookUrl()

  const [receivedConfigured, sendConfigured] = await Promise.all([
    setWebhook(config, 'update-webhook-received', webhookUrl),
    setWebhook(config, 'update-webhook-send', webhookUrl),
    enableNotifySentByMe(config),
  ])

  return { receivedConfigured, sendConfigured, webhookUrl }
}
