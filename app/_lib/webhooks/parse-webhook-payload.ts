import type { WebhookPlatform } from '@prisma/client'

interface ParseWebhookPayloadInput {
  rawBody: string
  // Content-Type da requisição (pode vir ausente/errado em alguns provedores).
  contentType: string | null
  platform: WebhookPlatform
}

// Campo de formulário onde a Monetizze coloca o postback completo em string JSON.
const FORM_PAYLOAD_FIELD = 'json'
const FORM_ENCODED_CONTENT_TYPE = 'application/x-www-form-urlencoded'

function isFormEncoded(contentType: string | null): boolean {
  if (!contentType) return false
  return contentType.toLowerCase().includes(FORM_ENCODED_CONTENT_TYPE)
}

// Monetizze (e provedores form-encoded) mandam o postback completo como string JSON
// no campo `json`. Usamos esse objeto como base e completamos com os campos escalares
// de topo do próprio form (ex: `chave_unica`) que porventura não estejam no `json` —
// defesa em profundidade: um falso-negativo na validação da chave bloquearia (401)
// webhooks legítimos. Não sobrescrevemos nada que já venha no `json`.
function parseFormEncoded(rawBody: string): unknown {
  const params = new URLSearchParams(rawBody)
  const structured = params.get(FORM_PAYLOAD_FIELD)
  if (!structured) {
    // Sem o campo `json`: melhor esforço com os pares de topo (sem a sintaxe campo[sub]).
    return Object.fromEntries(params.entries())
  }

  const parsed: unknown = JSON.parse(structured)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed
  }

  const merged = parsed as Record<string, unknown>
  for (const [key, value] of params.entries()) {
    const isTopLevelScalar = key !== FORM_PAYLOAD_FIELD && !key.includes('[')
    if (isTopLevelScalar && !(key in merged)) {
      merged[key] = value
    }
  }
  return merged
}

// Desembrulha o corpo cru no objeto estruturado que o resolver/validador esperam.
// Pode lançar (JSON.parse) — a rota chama dentro de try/catch e registra "Invalid JSON".
// Monetizze é SEMPRE form-encoded (doc oficial): forçamos o caminho por plataforma
// além do Content-Type, para resistir a header ausente/incorreto.
export function parseWebhookPayload(input: ParseWebhookPayloadInput): unknown {
  const { rawBody, contentType, platform } = input
  if (platform === 'MONETIZZE' || isFormEncoded(contentType)) {
    return parseFormEncoded(rawBody)
  }
  return JSON.parse(rawBody)
}
