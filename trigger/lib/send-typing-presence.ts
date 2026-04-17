import { logger } from '@trigger.dev/sdk/v3'
import { sendPresence } from '@/_lib/evolution/send-message'
import { resolveEvolutionCredentialsByInstanceName } from '@/_lib/evolution/resolve-credentials'

type InboxProvider = 'meta_cloud' | 'z_api' | 'evolution' | 'simulator'

interface SendTypingPresenceCtx {
  provider: InboxProvider
  /** Obrigatório para Evolution (e Z-API quando implementado) */
  instanceName?: string
  /** Obrigatório para Evolution (e Z-API quando implementado) */
  remoteJid?: string
  /** Usado em logging estruturado */
  conversationId: string
  /** Usado em logging estruturado */
  organizationId: string
}

/**
 * Envia indicador "digitando..." ao cliente via provider do inbox quando suportado.
 *
 * Projetado para ser chamado múltiplas vezes durante fluxos longos (o Evolution
 * expira o `composing` em poucos segundos). Nunca propaga erros — o envio da
 * mensagem ao cliente é sempre mais importante que o indicador.
 */
async function sendTypingPresence(ctx: SendTypingPresenceCtx): Promise<void> {
  switch (ctx.provider) {
    case 'evolution': {
      try {
        // instanceName e remoteJid são garantidos pelo caller para provider evolution
        if (!ctx.instanceName || !ctx.remoteJid) {
          logger.warn('Typing presence skipped: missing instanceName or remoteJid for evolution', {
            conversationId: ctx.conversationId,
            organizationId: ctx.organizationId,
          })
          return
        }

        const credentials = await resolveEvolutionCredentialsByInstanceName(ctx.instanceName)
        await sendPresence(ctx.instanceName, ctx.remoteJid, 'composing', credentials)
      } catch (error) {
        logger.warn('Typing presence failed', {
          conversationId: ctx.conversationId,
          organizationId: ctx.organizationId,
          provider: ctx.provider,
          error: error instanceof Error ? error.message : String(error),
        })
        // swallow — fluxo principal continua
      }
      break
    }

    case 'z_api': {
      // TODO: Z-API tem endpoint /send-presence-chat-state mas integração ainda
      // não existe no codebase. Seguir o mesmo padrão do Evolution quando implementar.
      logger.debug('Z-API typing presence not implemented yet', {
        conversationId: ctx.conversationId,
      })
      break
    }

    case 'meta_cloud': {
      // Meta Cloud API não suporta composing para business accounts — no-op silencioso
      break
    }

    case 'simulator': {
      // Simulator não tem provider externo — typing presence é no-op silencioso
      break
    }
  }
}

export type { SendTypingPresenceCtx }
export { sendTypingPresence }
