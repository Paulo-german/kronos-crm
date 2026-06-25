/**
 * Teste unitário do pipeline de entrada de webhooks: parsing do corpo,
 * resolução do evento por provedor e validação de token no payload.
 *
 * COMO RODAR:
 *   pnpm tsx trigger/lib/__tests__/webhook-event-resolver.test.ts
 *
 * Sem banco, sem env vars — payloads sintéticos fiéis às docs oficiais
 * (docs/INTEGRATIONS-WEBHOOK-EVENTS.md).
 *
 * COBERTURA:
 *   - parseWebhookPayload: JSON puro; Monetizze form-encoded (campo `json`);
 *     chave_unica só no nível do form (defesa em profundidade); sem campo `json`.
 *   - resolveProviderEvent Monetizze: venda aprovada, carrinho abandonado SEM
 *     `venda` (regressão do bug), assinatura cancelada, fallback por
 *     venda.codigo_status, evento fora do catálogo → null.
 *   - Não-regressão: Shopify (header topic), Hotmart (payloadField),
 *     GENERIC (noCatalog), sinal ausente → null.
 *   - verifyPayloadToken Monetizze: chave correta vs incorreta.
 */

import type { WebhookPlatform } from '@prisma/client'
import { parseWebhookPayload } from '@/_lib/webhooks/parse-webhook-payload'
import { resolveProviderEvent } from '@/_lib/webhooks/resolve-provider-event'
import { verifyPayloadToken } from '@/_lib/webhooks/verify-payload-token'

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

function assertEq<T>(actual: T, expected: T, message: string): void {
  assert(
    actual === expected,
    `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  )
}

function section(title: string): void {
  console.warn(`\n${title}`)
}

const MONETIZZE: WebhookPlatform = 'MONETIZZE'
const FORM_CT = 'application/x-www-form-urlencoded; charset=utf-8'
const SECRET = '82e98fd17562ae451ba4f9e3b9c2eab6'

// Monta um corpo form-encoded com o postback no campo `json` (como a Monetizze envia).
function monetizzeForm(
  json: Record<string, unknown>,
  extraTopLevel: Record<string, string> = {},
): string {
  const params = new URLSearchParams()
  params.set('json', JSON.stringify(json))
  for (const [key, value] of Object.entries(extraTopLevel)) {
    params.set(key, value)
  }
  return params.toString()
}

function resolveMonetizze(payload: unknown): string | null {
  return resolveProviderEvent({
    platform: MONETIZZE,
    headers: new Headers(),
    payload,
  }).detectedEventId
}

// ---------------------------------------------------------------------------
// parseWebhookPayload
// ---------------------------------------------------------------------------

section('parseWebhookPayload — JSON puro passa direto')
{
  const payload = parseWebhookPayload({
    rawBody: JSON.stringify({ event: 'orders/paid', id: 1 }),
    contentType: 'application/json',
    platform: 'SHOPIFY',
  }) as Record<string, unknown>
  assertEq(payload.event, 'orders/paid', 'JSON puro preservado')
}

section(
  'parseWebhookPayload — Monetizze form-encoded desembrulha o campo `json`',
)
{
  const body = monetizzeForm({
    chave_unica: SECRET,
    venda: { codigo: '123', codigo_status: 2 },
    tipoEvento: { codigo: 2 },
    comprador: { nome: 'Fulano', email: 'f@x.com', telefone: '31999999999' },
  })
  const payload = parseWebhookPayload({
    rawBody: body,
    contentType: FORM_CT,
    platform: MONETIZZE,
  }) as Record<string, unknown>
  const comprador = payload.comprador as Record<string, unknown>
  assertEq(
    comprador.email,
    'f@x.com',
    'estrutura aninhada do `json` preservada',
  )
  assertEq(payload.chave_unica, SECRET, 'chave_unica acessível na raiz')
}

section(
  'parseWebhookPayload — chave_unica só no nível do form (defesa em profundidade)',
)
{
  const body = monetizzeForm(
    { venda: { codigo_status: 2 }, tipoEvento: { codigo: 2 } },
    { chave_unica: SECRET },
  )
  const payload = parseWebhookPayload({
    rawBody: body,
    contentType: FORM_CT,
    platform: MONETIZZE,
  }) as Record<string, unknown>
  assertEq(
    payload.chave_unica,
    SECRET,
    'chave_unica do form mesclada no payload',
  )
}

section(
  'parseWebhookPayload — força form-encoded por plataforma mesmo sem Content-Type',
)
{
  const body = monetizzeForm({ tipoEvento: { codigo: 7 } })
  const payload = parseWebhookPayload({
    rawBody: body,
    contentType: null,
    platform: MONETIZZE,
  }) as Record<string, unknown>
  const tipoEvento = payload.tipoEvento as Record<string, unknown>
  assertEq(tipoEvento.codigo, 7, 'desembrulha mesmo com Content-Type ausente')
}

// ---------------------------------------------------------------------------
// resolveProviderEvent — Monetizze
// ---------------------------------------------------------------------------

section('Monetizze — venda aprovada (tipoEvento.codigo = 2)')
{
  const payload = parseWebhookPayload({
    rawBody: monetizzeForm({
      chave_unica: SECRET,
      venda: { codigo_status: 2 },
      tipoEvento: { codigo: 2 },
    }),
    contentType: FORM_CT,
    platform: MONETIZZE,
  })
  assertEq(resolveMonetizze(payload), '2', 'detecta venda aprovada')
}

section('Monetizze — carrinho abandonado SEM `venda` (regressão do bug)')
{
  // Antes, o sinal primário era venda.codigo_status; sem venda, nada era detectado.
  const payload = parseWebhookPayload({
    rawBody: monetizzeForm({
      chave_unica: SECRET,
      tipoEvento: { codigo: 7, descricao: 'Abandono de Checkout' },
      comprador: { email: 'b@x.com' },
    }),
    contentType: FORM_CT,
    platform: MONETIZZE,
  })
  assertEq(
    resolveMonetizze(payload),
    '7',
    'detecta abandono via tipoEvento.codigo sem venda',
  )
}

section('Monetizze — assinatura cancelada (tipoEvento.codigo = 103)')
{
  const payload = parseWebhookPayload({
    rawBody: monetizzeForm({
      chave_unica: SECRET,
      tipoEvento: { codigo: 103 },
      venda: { codigo_status: 3 },
    }),
    contentType: FORM_CT,
    platform: MONETIZZE,
  })
  assertEq(
    resolveMonetizze(payload),
    '103',
    'tipoEvento tem prioridade sobre venda.codigo_status',
  )
}

section('Monetizze — fallback por venda.codigo_status quando sem tipoEvento')
{
  const payload = parseWebhookPayload({
    rawBody: monetizzeForm({
      chave_unica: SECRET,
      venda: { codigo_status: 4 },
    }),
    contentType: FORM_CT,
    platform: MONETIZZE,
  })
  assertEq(
    resolveMonetizze(payload),
    '4',
    'cai no fallback venda.codigo_status (devolvida)',
  )
}

section('Monetizze — tipoEvento fora do catálogo sem venda → null (fail-open)')
{
  const payload = parseWebhookPayload({
    rawBody: monetizzeForm({ chave_unica: SECRET, tipoEvento: { codigo: 98 } }),
    contentType: FORM_CT,
    platform: MONETIZZE,
  })
  assertEq(
    resolveMonetizze(payload),
    null,
    'código fora do catálogo não resolve',
  )
}

// ---------------------------------------------------------------------------
// Não-regressão — outros provedores
// ---------------------------------------------------------------------------

section('Shopify — resolve por header topic')
{
  const resolved = resolveProviderEvent({
    platform: 'SHOPIFY',
    headers: new Headers({ 'x-shopify-topic': 'orders/paid' }),
    payload: {},
  })
  assertEq(resolved.detectedEventId, 'orders/paid', 'detecta topic do header')
  assertEq(resolved.category, 'payment_approved', 'categoria correta')
}

section('Hotmart — resolve por campo do payload')
{
  const resolved = resolveProviderEvent({
    platform: 'HOTMART',
    headers: new Headers(),
    payload: { event: 'PURCHASE_APPROVED' },
  })
  assertEq(
    resolved.detectedEventId,
    'PURCHASE_APPROVED',
    'detecta event do payload',
  )
}

section('GENERIC — sem catálogo nunca filtra (noCatalog)')
{
  const resolved = resolveProviderEvent({
    platform: 'GENERIC',
    headers: new Headers(),
    payload: { anything: true },
  })
  assertEq(resolved.noCatalog, true, 'noCatalog = true')
  assertEq(resolved.detectedEventId, null, 'detectedEventId = null')
}

section('Sinal primário ausente → null sem lançar')
{
  const resolved = resolveProviderEvent({
    platform: 'HOTMART',
    headers: new Headers(),
    payload: {},
  })
  assertEq(resolved.detectedEventId, null, 'payload sem event não resolve')
}

// ---------------------------------------------------------------------------
// verifyPayloadToken — Monetizze
// ---------------------------------------------------------------------------

section('verifyPayloadToken — chave_unica correta aprova; incorreta rejeita')
{
  const ok = parseWebhookPayload({
    rawBody: monetizzeForm({ chave_unica: SECRET, tipoEvento: { codigo: 2 } }),
    contentType: FORM_CT,
    platform: MONETIZZE,
  })
  assert(
    verifyPayloadToken({ platform: MONETIZZE, payload: ok, secretKey: SECRET }),
    'chave_unica correta → válido',
  )

  const wrong = parseWebhookPayload({
    rawBody: monetizzeForm({
      chave_unica: 'errada',
      tipoEvento: { codigo: 2 },
    }),
    contentType: FORM_CT,
    platform: MONETIZZE,
  })
  assert(
    !verifyPayloadToken({
      platform: MONETIZZE,
      payload: wrong,
      secretKey: SECRET,
    }),
    'chave_unica incorreta → inválido (401)',
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
