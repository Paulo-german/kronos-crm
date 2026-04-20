import { logger } from '@trigger.dev/sdk/v3'
import { ssrfSafeValidateUrl } from './ssrf-guard'
import { sendMediaUtility } from './send-media-utility'
import { sendOutboundMessage } from './send-outbound-message'
import type { InboxProviderContext } from '../tools/types'
import type { InboxCredentials } from './post-llm/send-whatsapp-message'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedBlock {
  kind: 'text' | 'media' | 'blocked_url'
  // Para blocos 'text' e 'blocked_url'
  text?: string
  // Para blocos 'media'
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'document'
}

export interface SendInlineMediaCtx {
  conversationId: string
  organizationId: string
  remoteJid: string
  inboxProvider: InboxProviderContext
  // Credenciais necessárias para sendOutboundMessage (blocos de texto)
  credentials: InboxCredentials
  dedupTtlSeconds?: number
}

export interface SendInlineMediaResult {
  blocksSent: number
  blocksSkipped: number
  ssrfBlockedUrls: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// URL isolada em uma linha — sem nenhum texto antes ou depois.
// URL com texto adjacente na mesma linha NÃO é candidata a mídia.
const ISOLATED_URL_RE = /^\s*https?:\/\/\S+\s*$/

// Limites de tamanho impostos pelo WhatsApp por tipo de mídia.
const WHATSAPP_SIZE_LIMITS: Record<'image' | 'video' | 'audio' | 'document', number> = {
  image: 5 * 1024 * 1024,    // 5 MB
  video: 16 * 1024 * 1024,   // 16 MB
  audio: 16 * 1024 * 1024,   // 16 MB (mesmo limite do vídeo)
  document: 100 * 1024 * 1024, // 100 MB
}

// MIME prefixes aceitos para detecção de mídia.
const ACCEPTED_MIME_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'application/pdf',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deduz o mediaType (enum do WhatsApp) a partir do Content-Type retornado
 * pelo HEAD. Retorna null para tipos não suportados.
 */
function resolveMediaType(
  contentType: string,
): 'image' | 'video' | 'audio' | 'document' | null {
  const normalized = contentType.split(';')[0].trim().toLowerCase()

  if (normalized.startsWith('image/')) return 'image'
  if (normalized.startsWith('video/')) return 'video'
  if (normalized.startsWith('audio/')) return 'audio'
  if (normalized === 'application/pdf') return 'document'

  return null
}

/**
 * Faz HEAD request para a URL e retorna mediaType + tamanho (quando disponível).
 * Retorna null se a URL não for mídia válida ou exceder o limite.
 */
async function probeMediaUrl(url: string): Promise<{
  mediaType: 'image' | 'video' | 'audio' | 'document'
  contentLength: number | null
} | null> {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), 2_000)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!response.ok) return null

    const rawContentType = response.headers.get('content-type') ?? ''
    const mediaType = resolveMediaType(rawContentType)
    if (!mediaType) return null

    const rawContentLength = response.headers.get('content-length')
    const contentLength = rawContentLength !== null ? parseInt(rawContentLength, 10) : null

    return { mediaType, contentLength: isNaN(contentLength ?? NaN) ? null : contentLength }
  } catch {
    return null
  } finally {
    clearTimeout(timeoutHandle)
  }
}

// ---------------------------------------------------------------------------
// Block builder
// ---------------------------------------------------------------------------

/**
 * Converte um array de linhas em blocos tipados (text | media | blocked_url).
 *
 * Blocos de texto adjacentes são fundidos em um único bloco para evitar
 * múltiplas chamadas desnecessárias ao sendOutboundMessage.
 *
 * A ordem dos blocos é sempre preservada — invariante crítico para UX.
 */
async function buildBlocks(lines: string[]): Promise<{
  blocks: ExtractedBlock[]
  ssrfBlockedUrls: string[]
}> {
  const blocks: ExtractedBlock[] = []
  const ssrfBlockedUrls: string[] = []

  // Buffer que acumula linhas de texto contíguas antes de um bloco de mídia.
  let pendingTextLines: string[] = []

  const flushText = () => {
    if (pendingTextLines.length === 0) return
    const text = pendingTextLines.join('\n').trim()
    if (text.length > 0) {
      blocks.push({ kind: 'text', text })
    }
    pendingTextLines = []
  }

  for (const line of lines) {
    const isIsolatedUrl = ISOLATED_URL_RE.test(line)

    if (!isIsolatedUrl) {
      pendingTextLines.push(line)
      continue
    }

    const url = line.trim()

    // Fase 1: SSRF guard — verifica scheme, DNS, Content-Type e Content-Length
    // para o maior limite possível (document = 100 MB) como pré-filtro.
    const ssrfResult = await ssrfSafeValidateUrl(url, {
      acceptedMimePrefixes: ACCEPTED_MIME_PREFIXES,
      maxBytes: WHATSAPP_SIZE_LIMITS.document,
    })

    if (!ssrfResult.allowed) {
      // URL bloqueada por SSRF — trata como texto simples para não perder contexto.
      ssrfBlockedUrls.push(url)
      pendingTextLines.push(line)
      continue
    }

    // Fase 2: HEAD request adicional para obter mediaType e tamanho exato.
    // (ssrfSafeValidateUrl já fez um HEAD mas não expõe os headers — fazemos
    // um segundo HEAD leve para extrair mediaType e Content-Length.)
    const probeResult = await probeMediaUrl(url)

    if (!probeResult) {
      // Tipo não suportado ou erro de rede — trata como texto.
      pendingTextLines.push(line)
      continue
    }

    const { mediaType, contentLength } = probeResult

    // Verifica limite específico por tipo de mídia do WhatsApp.
    if (contentLength !== null && contentLength > WHATSAPP_SIZE_LIMITS[mediaType]) {
      pendingTextLines.push(line)
      continue
    }

    // URL é mídia válida — flush do texto acumulado antes de inserir o bloco de mídia.
    flushText()
    blocks.push({ kind: 'media', mediaUrl: url, mediaType })
  }

  // Flush final de texto remanescente após o último bloco de mídia.
  flushText()

  return { blocks, ssrfBlockedUrls }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extrai URLs de mídia isoladas de uma mensagem LLM, valida cada uma contra
 * SSRF e envia os blocos na ordem original para o cliente WhatsApp.
 *
 * Contrato de ordem: a sequência texto1 → URL1 → texto2 → URL2 na mensagem
 * resulta exatamente em sendText(texto1) → sendMedia(URL1) → sendText(texto2)
 * → sendMedia(URL2). Ordem é invariante.
 *
 * URLs bloqueadas pelo guard SSRF são downgraded para texto para não silenciar
 * conteúdo legítimo (ex: URL de produto em formato de texto simples).
 */
export async function extractAndSendInlineMedia(
  fullMessage: string,
  ctx: SendInlineMediaCtx,
): Promise<SendInlineMediaResult> {
  const lines = fullMessage.split('\n')

  const { blocks, ssrfBlockedUrls } = await buildBlocks(lines)

  let blocksSent = 0
  let blocksSkipped = 0

  for (const block of blocks) {
    if (block.kind === 'text' || block.kind === 'blocked_url') {
      const text = block.text
      if (!text || text.trim().length === 0) {
        blocksSkipped++
        continue
      }

      try {
        await sendOutboundMessage({
          conversationId: ctx.conversationId,
          organizationId: ctx.organizationId,
          credentials: ctx.credentials,
          remoteJid: ctx.remoteJid,
          text,
          dedupTtlSeconds: ctx.dedupTtlSeconds,
        })
        blocksSent++
      } catch (error) {
        logger.warn('inline media: text block send failed', {
          conversationId: ctx.conversationId,
          error: error instanceof Error ? error.message : String(error),
        })
        blocksSkipped++
      }

      continue
    }

    // Bloco de mídia — mediaUrl e mediaType são sempre definidos aqui.
    if (block.kind === 'media') {
      const mediaUrl = block.mediaUrl
      const mediaType = block.mediaType

      if (!mediaUrl || !mediaType) {
        blocksSkipped++
        continue
      }

      try {
        const result = await sendMediaUtility(mediaUrl, mediaType, null, {
          conversationId: ctx.conversationId,
          organizationId: ctx.organizationId,
          remoteJid: ctx.remoteJid,
          inboxProvider: ctx.inboxProvider,
        })

        if (result.skipped) {
          blocksSkipped++
          continue
        }
        blocksSent++
      } catch (error) {
        logger.warn('inline media: media block send failed', {
          conversationId: ctx.conversationId,
          mediaUrl,
          mediaType,
          error: error instanceof Error ? error.message : String(error),
        })
        blocksSkipped++
      }
    }
  }

  return { blocksSent, blocksSkipped, ssrfBlockedUrls }
}
