import { createHmac, timingSafeEqual } from 'crypto'
import type { WebhookPlatform } from '@prisma/client'

interface VerifyHmacInput {
  platform: WebhookPlatform
  rawBody: string
  secretKey: string
  headers: Headers
}

// Calendly assina com formato `t=<ts>,v1=<hex>` e exige anti-replay (padrão Stripe).
// Rejeitamos assinaturas com timestamp mais antigo que esta janela.
const CALENDLY_TOLERANCE_SECONDS = 180
const MS_PER_SECOND = 1000

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

// WooCommerce: header X-WC-Webhook-Signature = HMAC-SHA256 do raw body em Base64
function verifyWooCommerce(
  rawBody: string,
  secretKey: string,
  headers: Headers,
): boolean {
  const received = headers.get('x-wc-webhook-signature')
  if (!received) return false
  const expected = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('base64')
  return safeEqualBuffer(received, expected)
}

// Calendly — assinatura nativa de header (barreira real, pré-parse).
// Header `Calendly-Webhook-Signature` no formato `t=<ts>,v1=<hmac_hex>`.
// Calcula HMAC-SHA256(`${t}.${rawBody}`, signingKey) em hex e compara timing-safe
// com v1. Anti-replay: rejeita timestamps mais antigos que CALENDLY_TOLERANCE_SECONDS.
function verifyCalendly(
  rawBody: string,
  secretKey: string,
  headers: Headers,
): boolean {
  const received = headers.get('calendly-webhook-signature')
  if (!received) return false

  const parts = received.split(',')
  let timestamp: string | null = null
  let signature: string | null = null
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 't') timestamp = value ?? null
    if (key === 'v1') signature = value ?? null
  }
  if (!timestamp || !signature) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  const nowSeconds = Date.now() / MS_PER_SECOND
  if (nowSeconds - timestampSeconds > CALENDLY_TOLERANCE_SECONDS) return false

  const expected = createHmac('sha256', secretKey)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')
  return safeEqualBuffer(signature, expected)
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
    case 'WOOCOMMERCE':
      return verifyWooCommerce(rawBody, secretKey, headers)
    case 'CALENDLY':
      return verifyCalendly(rawBody, secretKey, headers)
    // Monetizze e Eduzz mandam o segredo DENTRO do corpo (chave_unica / token),
    // então só dá pra validar PÓS-parse. Sua verificação ocorre em
    // verify-payload-token.ts (etapa pós-parse do pipeline), também como barreira
    // dura (401). Aqui no verificador de header NÃO podemos retornar `false` cego:
    // isso rejeitaria todo webhook deles. Retornamos `true` (header não é a barreira deles).
    case 'EDUZZ':
    case 'MONETIZZE':
      return true
    // Kiwify assina via query param (HMAC-SHA1), ainda não verificado nesta rodada
    // (decisão do usuário jun/2026: token-only). Cai no formato genérico; a UI
    // orienta deixar o secret em branco — a segurança vem do token único da URL.
    case 'KIWIFY':
    case 'GENERIC':
    case 'OTHER':
      return verifyGenericSha256Hex(rawBody, secretKey, headers)
    case 'GOOGLE_FORMS':
      return false
  }
}
