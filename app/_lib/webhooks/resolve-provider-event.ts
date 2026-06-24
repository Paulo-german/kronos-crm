import type { WebhookPlatform } from '@prisma/client'
import {
  WEBHOOK_EVENT_CATALOG,
  type CanonicalCategory,
  type ProviderEvent,
  type ProviderEventCatalog,
} from '@/(authenticated)/org/[orgSlug]/(settings)/settings/integrations/webhooks/_lib/webhook-events'

interface ResolveProviderEventInput {
  platform: WebhookPlatform
  // Headers já normaliza case (resolve o ponto HTTP/2 do Shopify); usar .get(lowercase).
  headers: Headers
  // payload é controlado pelo atacante (entrada não confiável): tratar como unknown.
  payload: unknown
}

export interface ResolvedProviderEvent {
  // Identificador técnico detectado (chave do catálogo), ou null se não foi possível resolver.
  detectedEventId: string | null
  category: CanonicalCategory | null
  // true quando o provedor não tem catálogo (GENERIC/OTHER) — nunca filtra.
  noCatalog: boolean
}

// Getter de dot-path DEFENSIVO sobre input não confiável.
// CRÍTICO (§11.3): NUNCA pode lançar exceção — um throw aqui viraria 500/DoS.
// Retorna null em qualquer falha (null/undefined/array no caminho/tipo errado/profundidade).
function safeGetPath(source: unknown, path: string): string | null {
  try {
    if (source === null || typeof source !== 'object') return null
    const segments = path.split('.')
    let current: unknown = source
    for (const segment of segments) {
      if (current === null || typeof current !== 'object') return null
      const isArrayIndex = /^\d+$/.test(segment)
      if (Array.isArray(current)) {
        if (!isArrayIndex) return null
        current = current[Number(segment)]
        continue
      }
      current = (current as Record<string, unknown>)[segment]
    }
    if (current === null || current === undefined) return null
    if (typeof current === 'string') return current
    if (typeof current === 'number' || typeof current === 'boolean') {
      return String(current)
    }
    return null
  } catch {
    // Qualquer exceção inesperada vira null — fail-open coerente com o resolver.
    return null
  }
}

function readPrimarySignal(
  catalog: ProviderEventCatalog,
  headers: Headers,
  payload: unknown,
): string | null {
  if (catalog.mode === 'header') {
    return headers.get(catalog.source)
  }
  return safeGetPath(payload, catalog.source)
}

function findEvent(
  catalog: ProviderEventCatalog,
  eventId: string,
): ProviderEvent | null {
  return catalog.events.find((event) => event.id === eventId) ?? null
}

// WooCommerce: pós-criação tudo vem como `order.updated`; o status do payload
// discrimina pago/pendente/cancelado/estornado. Catálogo usa ids `order.updated:<status>`.
function matchWooCommerce(
  catalog: ProviderEventCatalog,
  topic: string,
  payload: unknown,
): ProviderEvent | null {
  const directMatch = findEvent(catalog, topic)
  if (directMatch) return directMatch
  if (topic !== 'order.updated') return null
  const statusPath = catalog.secondarySource
  if (!statusPath) return null
  const status = safeGetPath(payload, statusPath)
  if (!status) return null
  const normalized = normalizeWooStatus(status)
  if (!normalized) return null
  return findEvent(catalog, `order.updated:${normalized}`)
}

// Agrupa os status do Woo nas chaves canônicas do catálogo.
function normalizeWooStatus(status: string): string | null {
  const pendingStatuses = new Set(['pending', 'on-hold', 'failed'])
  const paidStatuses = new Set(['processing', 'completed'])
  if (pendingStatuses.has(status)) return 'pending'
  if (paidStatuses.has(status)) return 'processing'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'refunded') return 'refunded'
  return null
}

// Monetizze: tipoEvento.codigo é o sinal primário (cobre tudo, inclusive abandono=7
// e assinatura=103, que não têm `venda` no payload). venda.codigo_status (mesmos
// códigos 1-5) é o fallback quando o postback não traz tipoEvento. Qualquer um dos
// dois pode faltar — por isso o sinal primário aqui pode chegar null.
function matchMonetizze(
  catalog: ProviderEventCatalog,
  tipoEventoSignal: string | null,
  payload: unknown,
): ProviderEvent | null {
  if (tipoEventoSignal) {
    const direct = findEvent(catalog, tipoEventoSignal)
    if (direct) return direct
  }
  const fallbackPath = catalog.secondarySource
  if (fallbackPath) {
    const statusCode = safeGetPath(payload, fallbackPath)
    if (statusCode) return findEvent(catalog, statusCode)
  }
  return null
}

export function resolveProviderEvent(
  input: ResolveProviderEventInput,
): ResolvedProviderEvent {
  const { platform, headers, payload } = input

  const catalog = WEBHOOK_EVENT_CATALOG[platform]
  // GENERIC/OTHER e quaisquer provedores sem catálogo: nunca filtram.
  if (!catalog) {
    return { detectedEventId: null, category: null, noCatalog: true }
  }

  // primarySignal pode ser null: a maioria dos provedores não resolve sem ele, mas
  // Monetizze tem um fallback (venda.codigo_status) — por isso a decisão de desistir
  // fica com o matcher de cada provedor, não num early-return aqui.
  const primarySignal = readPrimarySignal(catalog, headers, payload)

  const matched = matchEventByProvider(
    platform,
    catalog,
    primarySignal,
    payload,
  )
  if (!matched) {
    return { detectedEventId: null, category: null, noCatalog: false }
  }

  return {
    detectedEventId: matched.id,
    category: matched.category,
    noCatalog: false,
  }
}

// Discriminação secundária por provedor (Woo/Monetizze). Demais provedores
// resolvem direto pelo sinal primário. Monetizze é o único que tolera sinal
// primário ausente (tem fallback interno); os demais não resolvem sem ele.
function matchEventByProvider(
  platform: WebhookPlatform,
  catalog: ProviderEventCatalog,
  primarySignal: string | null,
  payload: unknown,
): ProviderEvent | null {
  if (platform === 'MONETIZZE') {
    return matchMonetizze(catalog, primarySignal, payload)
  }
  if (!primarySignal) return null
  if (platform === 'WOOCOMMERCE') {
    return matchWooCommerce(catalog, primarySignal, payload)
  }
  return findEvent(catalog, primarySignal)
}
