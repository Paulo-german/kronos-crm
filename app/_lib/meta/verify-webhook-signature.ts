import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Valida a assinatura X-Hub-Signature-256 do webhook Meta.
 * SEGURANCA: Impede que payloads nao-Meta sejam processados.
 *
 * Formato da assinatura: "sha256=<hex_digest>"
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const appSecret = process.env.META_APP_SECRET

  if (!appSecret) {
    // Em producao sem APP_SECRET configurado, bloquear todos os webhooks (fail-secure)
    console.warn('[meta-webhook] META_APP_SECRET not configured — blocking webhook (fail-secure)')
    return false
  }

  if (!signature) return false

  const expectedSignature =
    'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')

  // Buffers devem ter o mesmo tamanho para timingSafeEqual
  if (signature.length !== expectedSignature.length) return false

  // Usar timingSafeEqual para resistencia a timing attacks (constante O(n))
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}
