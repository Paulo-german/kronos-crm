import { timingSafeEqual } from 'crypto'
import type { WebhookPlatform } from '@prisma/client'

interface VerifyPayloadTokenInput {
  platform: WebhookPlatform
  // payload já parseado (esta verificação roda PÓS-parse): o segredo viaja dentro do corpo.
  payload: unknown
  secretKey: string
}

function safeEqualBuffer(valueA: string, valueB: string): boolean {
  const bufA = Buffer.from(valueA)
  const bufB = Buffer.from(valueB)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Leitura defensiva de um campo string do payload não confiável — nunca lança.
function readStringField(payload: unknown, key: string): string | null {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return null
  }
  const value = (payload as Record<string, unknown>)[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

// Monetizze envia a `chave_unica` dentro do corpo; validamos contra o secret armazenado.
function verifyMonetizze(payload: unknown, secretKey: string): boolean {
  const received = readStringField(payload, 'chave_unica')
  if (!received) return false
  return safeEqualBuffer(received, secretKey)
}

// Verificação PÓS-parse (token-no-payload). Barreira dura igual ao HMAC: falha => 401.
// Provedores que NÃO usam token-no-payload retornam true (não barram nesta etapa —
// a barreira deles é o HMAC de header, em verify-hmac-signature.ts).
export function verifyPayloadToken(input: VerifyPayloadTokenInput): boolean {
  const { platform, payload, secretKey } = input
  switch (platform) {
    case 'MONETIZZE':
      return verifyMonetizze(payload, secretKey)
    // Eduzz e Kiwify validam por HMAC de PRÉ-parse (header `x-signature` / query
    // param `?signature=`), em verify-hmac-signature.ts. Não barram nesta etapa.
    case 'EDUZZ':
    case 'SHOPIFY':
    case 'WOOCOMMERCE':
    case 'NUVEM_SHOP':
    case 'HOTMART':
    case 'CALENDLY':
    case 'KIWIFY':
    case 'GOOGLE_FORMS':
    case 'GENERIC':
    case 'OTHER':
      return true
  }
}
