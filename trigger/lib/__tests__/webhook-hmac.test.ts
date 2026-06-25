/**
 * Teste unitário das barreiras HMAC de entrada de webhooks (pré-parse, 401).
 *
 * COMO RODAR:
 *   pnpm tsx trigger/lib/__tests__/webhook-hmac.test.ts
 *
 * Sem banco, sem env vars — assina payloads sintéticos com o mesmo algoritmo de
 * cada provedor (fiel a docs/INTEGRATIONS-WEBHOOK-EVENTS.md) e confere que a
 * assinatura correta aprova e a incorreta/ausente rejeita.
 *
 * COBERTURA:
 *   - Eduzz: header `x-signature` = HMAC-SHA256(secret, rawBody), hex E base64,
 *     com/sem prefixo `sha256=`; assinatura errada e header ausente → false.
 *   - Kiwify: query param `?signature=` = HMAC-SHA1(secret, rawBody) hex; corpo
 *     re-serializado (hash quebrado) e param ausente → false.
 *   - Não-regressão: Shopify (header base64) continua válido; Monetizze não barra
 *     no header (segredo viaja no corpo).
 */

import { createHmac } from 'crypto'
import type { WebhookPlatform } from '@prisma/client'
import { verifyHmacSignature } from '@/_lib/webhooks/verify-hmac-signature'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.warn(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ ${message}`)
    failed++
  }
}

function section(title: string): void {
  console.warn(`\n${title}`)
}

const SECRET = '82e98fd17562ae451ba4f9e3b9c2eab6'
const EMPTY_QS = new URLSearchParams()

function verify(input: {
  platform: WebhookPlatform
  rawBody: string
  headers?: Headers
  searchParams?: URLSearchParams
}): boolean {
  return verifyHmacSignature({
    platform: input.platform,
    rawBody: input.rawBody,
    secretKey: SECRET,
    headers: input.headers ?? new Headers(),
    searchParams: input.searchParams ?? EMPTY_QS,
  })
}

// ---------------------------------------------------------------------------
// Eduzz — header x-signature (HMAC-SHA256)
// ---------------------------------------------------------------------------

const EDUZZ_BODY = JSON.stringify({
  id: 'evt_1',
  event: 'myeduzz.invoice_paid',
  data: { buyer: { email: 'b@x.com' } },
})

section('Eduzz — x-signature em hex aprova')
{
  const hex = createHmac('sha256', SECRET).update(EDUZZ_BODY).digest('hex')
  assert(
    verify({
      platform: 'EDUZZ',
      rawBody: EDUZZ_BODY,
      headers: new Headers({ 'x-signature': hex }),
    }),
    'hex correto → válido',
  )
}

section('Eduzz — x-signature em base64 aprova (codificação tolerante)')
{
  const b64 = createHmac('sha256', SECRET).update(EDUZZ_BODY).digest('base64')
  assert(
    verify({
      platform: 'EDUZZ',
      rawBody: EDUZZ_BODY,
      headers: new Headers({ 'x-signature': b64 }),
    }),
    'base64 correto → válido',
  )
}

section('Eduzz — prefixo `sha256=` é tolerado')
{
  const hex = createHmac('sha256', SECRET).update(EDUZZ_BODY).digest('hex')
  assert(
    verify({
      platform: 'EDUZZ',
      rawBody: EDUZZ_BODY,
      headers: new Headers({ 'x-signature': `sha256=${hex}` }),
    }),
    'prefixo sha256= correto → válido',
  )
}

section('Eduzz — assinatura errada e header ausente rejeitam (401)')
{
  assert(
    !verify({
      platform: 'EDUZZ',
      rawBody: EDUZZ_BODY,
      headers: new Headers({ 'x-signature': 'deadbeef' }),
    }),
    'assinatura inválida → false',
  )
  assert(
    !verify({ platform: 'EDUZZ', rawBody: EDUZZ_BODY }),
    'header ausente → false',
  )
  // Corpo adulterado depois de assinado: HMAC não bate.
  const hex = createHmac('sha256', SECRET).update(EDUZZ_BODY).digest('hex')
  assert(
    !verify({
      platform: 'EDUZZ',
      rawBody: EDUZZ_BODY + ' ',
      headers: new Headers({ 'x-signature': hex }),
    }),
    'corpo adulterado → false',
  )
}

// ---------------------------------------------------------------------------
// Kiwify — query param signature (HMAC-SHA1)
// ---------------------------------------------------------------------------

const KIWIFY_BODY = JSON.stringify({
  order_id: 'o_1',
  order_status: 'paid',
  webhook_event_type: 'compra_aprovada',
})

section('Kiwify — ?signature= em hex (SHA1) aprova')
{
  const sig = createHmac('sha1', SECRET).update(KIWIFY_BODY).digest('hex')
  assert(
    verify({
      platform: 'KIWIFY',
      rawBody: KIWIFY_BODY,
      searchParams: new URLSearchParams({ signature: sig }),
    }),
    'SHA1 hex correto → válido',
  )
}

section('Kiwify — re-serialização que quebra o hash rejeita')
{
  // Assina o corpo original mas valida contra um corpo re-serializado (espaços
  // diferentes): o hash não bate — por isso a rota usa o RAW body.
  const sig = createHmac('sha1', SECRET).update(KIWIFY_BODY).digest('hex')
  const reSerialized = JSON.stringify(JSON.parse(KIWIFY_BODY) as object)
  assert(
    reSerialized === KIWIFY_BODY,
    'sanity: este corpo re-serializa igual (controle do teste)',
  )
  assert(
    !verify({
      platform: 'KIWIFY',
      rawBody: KIWIFY_BODY + '\n',
      searchParams: new URLSearchParams({ signature: sig }),
    }),
    'corpo com bytes extras → false',
  )
}

section('Kiwify — param ausente e SHA256 (algoritmo errado) rejeitam')
{
  assert(
    !verify({ platform: 'KIWIFY', rawBody: KIWIFY_BODY }),
    'signature ausente → false',
  )
  const wrongAlgo = createHmac('sha256', SECRET)
    .update(KIWIFY_BODY)
    .digest('hex')
  assert(
    !verify({
      platform: 'KIWIFY',
      rawBody: KIWIFY_BODY,
      searchParams: new URLSearchParams({ signature: wrongAlgo }),
    }),
    'hash SHA256 onde se espera SHA1 → false',
  )
}

// ---------------------------------------------------------------------------
// Não-regressão
// ---------------------------------------------------------------------------

section('Shopify — header base64 continua válido')
{
  const body = JSON.stringify({ id: 1 })
  const sig = createHmac('sha256', SECRET).update(body).digest('base64')
  assert(
    verify({
      platform: 'SHOPIFY',
      rawBody: body,
      headers: new Headers({ 'x-shopify-hmac-sha256': sig }),
    }),
    'Shopify base64 correto → válido',
  )
}

section('Monetizze — não barra no header (segredo viaja no corpo)')
{
  assert(
    verify({ platform: 'MONETIZZE', rawBody: 'json=%7B%7D' }),
    'Monetizze passa direto no header (barreira é pós-parse)',
  )
}

// ---------------------------------------------------------------------------
// Resultado final
// ---------------------------------------------------------------------------

console.warn(
  `\n${passed + failed} assertions — ${passed} passed, ${failed} failed\n`,
)

if (failed > 0) {
  process.exit(1)
}
