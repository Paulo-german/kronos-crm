import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifica o signed_request enviado pela Meta em callbacks de data deletion.
 *
 * Formato: "<base64url_signature>.<base64url_payload>"
 * HMAC SHA256 da parte payload usando META_APP_SECRET como chave.
 *
 * Retorna o payload decodificado se a assinatura for válida, null caso contrário.
 * SEGURANÇA: Usa timingSafeEqual para resistência a timing attacks.
 */
export function verifyMetaSignedRequest(signedRequest: string): { user_id: string } | null {
  const appSecret = process.env.META_APP_SECRET

  if (!appSecret) {
    console.warn('[meta-signed-request] META_APP_SECRET not configured — rejecting (fail-secure)')
    return null
  }

  // O signed_request tem exatamente um "." separando signature e payload
  const dotIndex = signedRequest.indexOf('.')
  if (dotIndex === -1) return null

  const encodedSig = signedRequest.slice(0, dotIndex)
  const encodedPayload = signedRequest.slice(dotIndex + 1)

  // Decodificar payload base64url → JSON
  let parsedPayload: unknown
  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    parsedPayload = JSON.parse(payloadJson)
  } catch {
    return null
  }

  // Calcular HMAC SHA256 da parte payload (string raw, não decodificada)
  const expectedSigBuffer = createHmac('sha256', appSecret)
    .update(encodedPayload)
    .digest()

  // Decodificar a assinatura recebida
  let receivedSigBuffer: Buffer
  try {
    receivedSigBuffer = Buffer.from(encodedSig, 'base64url')
  } catch {
    return null
  }

  // Buffers devem ter o mesmo tamanho para timingSafeEqual
  if (receivedSigBuffer.length !== expectedSigBuffer.length) return null

  const isValid = timingSafeEqual(receivedSigBuffer, expectedSigBuffer)
  if (!isValid) return null

  // Validar que o payload tem user_id (campo obrigatório pela Meta)
  if (
    typeof parsedPayload !== 'object' ||
    parsedPayload === null ||
    !('user_id' in parsedPayload) ||
    typeof (parsedPayload as Record<string, unknown>).user_id !== 'string'
  ) {
    return null
  }

  return parsedPayload as { user_id: string }
}
