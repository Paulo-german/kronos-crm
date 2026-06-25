import { createHmac, timingSafeEqual } from 'crypto'
import type { WebhookPlatform } from '@prisma/client'

interface VerifyHmacInput {
  platform: WebhookPlatform
  rawBody: string
  secretKey: string
  headers: Headers
  // Query params da URL do webhook — Kiwify assina via `?signature=` (não header).
  searchParams: URLSearchParams
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

// Eduzz (Myeduzz v3): header `x-signature` = HMAC-SHA256(secretKey, rawBody).
// A doc oficial não fixa a codificação do digest — aceitamos hex OU base64 (e o
// prefixo opcional `sha256=`) pra não barrar (401) webhook legítimo por causa do
// formato. Forjar continua exigindo o secret: a barreira segue dura.
function verifyEduzz(
  rawBody: string,
  secretKey: string,
  headers: Headers,
): boolean {
  const received = headers.get('x-signature')
  if (!received) return false
  const normalized = received.replace(/^sha256=/i, '')
  const expectedHex = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex')
  const expectedB64 = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('base64')
  return (
    safeEqualBuffer(normalized, expectedHex) ||
    safeEqualBuffer(normalized, expectedB64)
  )
}

// Kiwify: query param `?signature=<hex>` = HMAC-SHA1(rawBody, token) em hex.
// O token é o secret definido na criação do webhook. Barreira real, pré-parse —
// validar sobre o raw body (re-serializar com JSON.stringify quebraria o hash).
function verifyKiwify(
  rawBody: string,
  secretKey: string,
  searchParams: URLSearchParams,
): boolean {
  const received = searchParams.get('signature')
  if (!received) return false
  const expected = createHmac('sha1', secretKey).update(rawBody).digest('hex')
  return safeEqualBuffer(received, expected)
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
  const { platform, rawBody, secretKey, headers, searchParams } = input
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
    // Eduzz (Myeduzz v3) tem HMAC oficial de header (`x-signature`, SHA256 do raw
    // body) — barreira dura, validada aqui PRÉ-parse. Kiwify assina via query param
    // (`?signature=`, SHA1 do raw body), também pré-parse.
    case 'EDUZZ':
      return verifyEduzz(rawBody, secretKey, headers)
    case 'KIWIFY':
      return verifyKiwify(rawBody, secretKey, searchParams)
    // Monetizze manda o segredo DENTRO do corpo (chave_unica), então só dá pra
    // validar PÓS-parse. Sua verificação ocorre em verify-payload-token.ts, também
    // como barreira dura (401). Aqui NÃO podemos retornar `false` cego: rejeitaria
    // todo webhook dela. Retornamos `true` (header não é a barreira da Monetizze).
    case 'MONETIZZE':
      return true
    case 'GENERIC':
    case 'OTHER':
      return verifyGenericSha256Hex(rawBody, secretKey, headers)
    case 'GOOGLE_FORMS':
      return false
  }
}
