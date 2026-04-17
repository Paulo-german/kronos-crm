import { createHash } from 'crypto'
import { redis } from '@/_lib/redis'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import type { InboxProviderContext } from '../tools/types'

// TTL de 5 minutos para dedup de URL de mídia já enviada nesta conversa.
const DEDUP_TTL_SECONDS = 300

// Mapa de extensão para MIME type — portado 1:1 de trigger/tools/send-media.ts.
const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  '3gp': 'video/3gpp',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
}

// Fallbacks de MIME type por categoria quando a extensão não está no mapa.
const MEDIA_TYPE_FALLBACK_MIME: Record<'image' | 'video' | 'audio' | 'document', string> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/ogg',
  document: 'application/octet-stream',
}

export interface SendMediaUtilityCtx {
  conversationId: string
  organizationId: string
  remoteJid: string
  // Não-null nesta fronteira — o orchestrator valida antes de chamar esta utility.
  inboxProvider: InboxProviderContext
}

export interface SendMediaUtilityResult {
  sentId: string
  // true quando a URL já foi enviada nesta conversa nos últimos 5 min (dedup hit).
  skipped: boolean
}

/**
 * Gera um hash SHA-256 curto (16 hex chars) da URL para uso como chave de dedup.
 * Evita chaves Redis longas sem perder unicidade prática para este TTL.
 */
function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16)
}

/**
 * Envia um arquivo de mídia via WhatsApp usando o provider configurado na inbox.
 *
 * Portada 1:1 da lógica de envio de trigger/tools/send-media.ts, sem a camada
 * de tool (schema Zod, retorno de success/message). Lança erro em caso de falha —
 * o orchestrator captura por bloco e loga o warning sem interromper os demais blocos.
 *
 * Dedup: se a mesma URL já foi enviada nesta conversa nos últimos 5 min, retorna
 * { sentId: '', skipped: true } sem reenviar.
 */
export async function sendMediaUtility(
  url: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  caption: string | null,
  ctx: SendMediaUtilityCtx,
): Promise<SendMediaUtilityResult> {
  const urlHash = hashUrl(url)
  const dedupKey = `dedup:media:${ctx.conversationId}:${urlHash}`

  // Verifica se a URL já foi enviada nesta conversa. SET NX retorna null quando
  // a chave já existe (dedup hit), e 'OK' quando é nova (set com sucesso).
  // Em caso de erro Redis usamos uma sentinela distinta para não bloquear o envio.
  const dedupResult = await redis
    .set(dedupKey, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
    .catch(() => 'redis_error' as const)

  if (dedupResult === null) {
    return { sentId: '', skipped: true }
  }

  // Resolve extensão e MIME type a partir da URL — ignora query string/fragmento.
  const urlWithoutQuery = url.split('?')[0].split('#')[0]
  const extension = urlWithoutQuery.split('.').pop()?.toLowerCase() ?? ''
  const mimeType = EXTENSION_TO_MIME_TYPE[extension] ?? MEDIA_TYPE_FALLBACK_MIME[mediaType]

  // Extrai o nome do arquivo para uso como fileName no provider.
  const fileName = urlWithoutQuery.split('/').pop() || 'media'

  const provider = resolveWhatsAppProvider(ctx.inboxProvider)

  // Provider.sendMedia aceita 'image' | 'document' | 'video'; 'audio' é
  // tratado como document para compatibilidade com a interface existente.
  const resolvedMediaType = mediaType === 'audio' ? 'document' : mediaType

  const sentId = await (async () => {
    if (ctx.inboxProvider.connectionType !== 'META_CLOUD') {
      // Evolution e Z-API: envia a URL pública diretamente — o provider baixa do seu lado.
      return provider.sendMedia(ctx.remoteJid, '', mimeType, resolvedMediaType, fileName, caption ?? undefined, url)
    }

    // Meta Cloud exige download prévio → conversão para base64 → upload via Media API.
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download media for Meta Cloud upload: ${response.status} ${response.statusText}`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString('base64')

    return provider.sendMedia(ctx.remoteJid, base64, mimeType, resolvedMediaType, fileName, caption ?? undefined)
  })()

  // Registra o sentId retornado pelo provider para dedup de webhook
  // (evita que a mensagem enviada pelo agente seja reprocessada como entrada).
  await redis.set(`dedup:${sentId}`, '1', 'EX', DEDUP_TTL_SECONDS).catch(() => {})

  return { sentId, skipped: false }
}
