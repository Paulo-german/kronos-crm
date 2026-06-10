import { createHmac, timingSafeEqual } from 'crypto'
import type { WebhookPlatform } from '@prisma/client'

interface VerifyHmacInput {
  platform: WebhookPlatform
  rawBody: string
  secretKey: string
  headers: Headers
}

function safeEqualBuffer(valueA: string, valueB: string): boolean {
  const bufA = Buffer.from(valueA)
  const bufB = Buffer.from(valueB)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function verifyShopify(
  rawBody: string,
  secretKey: string,
  headers: Headers,
): boolean {
  const received = headers.get('x-shopify-hmac-sha256')
  if (!received) return false
  const expected = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('base64')
  return safeEqualBuffer(received, expected)
}

function verifyNuvemShop(
  rawBody: string,
  secretKey: string,
  headers: Headers,
): boolean {
  const received = headers.get('x-linkedstore-hmac-sha256')
  if (!received) return false
  const expected = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('base64')
  return safeEqualBuffer(received, expected)
}

// Hotmart usa `hottok` — token estático compartilhado, não é HMAC de payload.
// A plataforma envia o valor literal do secret no header; comparamos timing-safe.
function verifyHotmart(secretKey: string, headers: Headers): boolean {
  const received = headers.get('x-hotmart-hottok')
  if (!received) return false
  return safeEqualBuffer(received, secretKey)
}

// Padrão GitHub: header X-Webhook-Signature no formato `sha256=<hex>`
function verifyGenericSha256Hex(
  rawBody: string,
  secretKey: string,
  headers: Headers,
): boolean {
  const received = headers.get('x-webhook-signature')
  if (!received) return false
  const expectedHex = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex')
  return safeEqualBuffer(received, `sha256=${expectedHex}`)
}

export function verifyHmacSignature(input: VerifyHmacInput): boolean {
  const { platform, rawBody, secretKey, headers } = input
  switch (platform) {
    case 'SHOPIFY':
      return verifyShopify(rawBody, secretKey, headers)
    case 'NUVEM_SHOP':
      return verifyNuvemShop(rawBody, secretKey, headers)
    case 'HOTMART':
      return verifyHotmart(secretKey, headers)
    case 'GENERIC':
    case 'OTHER':
      return verifyGenericSha256Hex(rawBody, secretKey, headers)
    case 'GOOGLE_FORMS':
      return false
    default:
      return false
  }
}
