import type { WhatsAppProvider } from '@/_lib/whatsapp/provider'
import { normalizePhoneToDigits } from '@/_lib/whatsapp/normalize-phone'
import type { MetaTemplateSendComponent } from '@/_lib/meta/types'

// Campos da inbox necessários para resolver o provider de envio.
export const INBOX_PROVIDER_SELECT = {
  id: true,
  isActive: true,
  connectionType: true,
  channel: true,
  evolutionInstanceName: true,
  evolutionApiUrl: true,
  evolutionApiKey: true,
  metaPhoneNumberId: true,
  metaAccessToken: true,
  metaIgUserId: true,
  zapiInstanceId: true,
  zapiToken: true,
  zapiClientToken: true,
} as const

// Monta os components do template Meta a partir dos params fixos (v1: só corpo).
// Variável de cabeçalho é bloqueada na UI, então não há component 'header' aqui.
export function buildTemplateComponents(
  params: unknown,
): MetaTemplateSendComponent[] | undefined {
  if (!Array.isArray(params) || params.length === 0) return undefined
  return [
    {
      type: 'body',
      parameters: (params as string[]).map((text) => ({
        type: 'text' as const,
        text,
      })),
    },
  ]
}

// Dados mínimos de um disparo para o envio de uma mensagem.
export interface BroadcastSendContext {
  connectionType: string
  messageContent: string | null
  templateName: string | null
  templateLanguage: string | null
  templateParams: unknown
}

export interface BroadcastSendResult {
  ok: boolean
  providerMessageId: string | null
  error: string | null
}

/**
 * Envia uma mensagem de disparo para um número (E164 com `+`), escolhendo entre
 * texto livre (Evolution/Z-API) e template HSM (Meta Cloud). Não lança: encapsula
 * sucesso/erro em BroadcastSendResult para o chamador atualizar o recipient.
 */
export async function sendBroadcastMessage(
  provider: WhatsAppProvider,
  broadcast: BroadcastSendContext,
  phoneSnapshot: string,
): Promise<BroadcastSendResult> {
  try {
    // phoneSnapshot é E164 com `+`; os providers esperam dígitos sem `+`.
    const recipientPhone = normalizePhoneToDigits(phoneSnapshot)
    if (!recipientPhone) {
      return { ok: false, providerMessageId: null, error: 'Telefone inválido.' }
    }

    if (broadcast.connectionType === 'META_CLOUD') {
      const providerMessageId = await provider.sendTemplate(
        recipientPhone,
        broadcast.templateName ?? '',
        broadcast.templateLanguage ?? 'pt_BR',
        buildTemplateComponents(broadcast.templateParams),
      )
      return { ok: true, providerMessageId, error: null }
    }

    const sentIds = await provider.sendText(
      recipientPhone,
      broadcast.messageContent ?? '',
    )
    return { ok: true, providerMessageId: sentIds[0] ?? null, error: null }
  } catch (sendError) {
    return {
      ok: false,
      providerMessageId: null,
      error: (sendError instanceof Error
        ? sendError.message
        : String(sendError)
      ).slice(0, 500),
    }
  }
}
