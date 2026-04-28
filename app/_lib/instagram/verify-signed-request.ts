import { createHmac, timingSafeEqual } from 'crypto'

interface SignedRequestPayload {
  user_id: string
  [key: string]: unknown
}

/**
 * Verifica o signed_request enviado pela Meta no callback de data deletion.
 *
 * Formato: base64Signature.base64Payload (ponto separa assinatura do payload)
 * HMAC SHA256 do payload (base64url) usando META_APP_SECRET como chave.
 *
 * Retorna o payload parsed ou null se a assinatura for invalida.
 *
 * Documentacao: https://developers.facebook.com/docs/facebook-login/security#signed-requests
 */
export function verifyMetaSignedRequest(signedRequest: string): SignedRequestPayload | null {
  const dotIndex = signedRequest.indexOf('.')

  // Formato invalido — deve conter exatamente um ponto separando assinatura e payload
  if (dotIndex === -1) {
    return null
  }

  const encodedSignature = signedRequest.slice(0, dotIndex)
  const encodedPayload = signedRequest.slice(dotIndex + 1)

  const appSecret = process.env.META_APP_SECRET

  if (!appSecret) {
    throw new Error('META_APP_SECRET nao configurado. Impossivel verificar signed_request.')
  }

  // Calcular HMAC SHA256 esperado
  const expectedSignature = createHmac('sha256', appSecret)
    .update(encodedPayload)
    .digest('base64url')

  // Comparar com timing-safe para evitar timing attacks
  const signatureBuffer = Buffer.from(encodedSignature, 'base64url')
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url')

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  // Decodificar e parsear o payload
  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    const payload = JSON.parse(payloadJson) as unknown

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('user_id' in payload) ||
      typeof (payload as Record<string, unknown>).user_id !== 'string'
    ) {
      return null
    }

    return payload as SignedRequestPayload
  } catch {
    return null
  }
}
