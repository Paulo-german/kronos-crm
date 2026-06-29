import { isElevated } from '@/_lib/rbac'
import type { MemberRole } from '@prisma/client'

/**
 * Determina se PII deve ser mascarado para este usuario/org.
 * Retorna true quando: a org ativou o toggle E o usuario e MEMBER.
 */
export function shouldMaskPii(
  userRole: MemberRole,
  hidePiiFromMembers: boolean,
): boolean {
  if (!hidePiiFromMembers) return false
  return !isElevated(userRole)
}

/** Mascara email: "john@example.com" → "j***@e***.com" */
export function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const [domainName, ...tld] = domain.split('.')
  const maskedLocal = (local[0] ?? '') + '***'
  const maskedDomain = (domainName[0] ?? '') + '***'
  return `${maskedLocal}@${maskedDomain}.${tld.join('.')}`
}

/** Mascara telefone: "11999991234" → "(**) *****-1234" */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  const lastFour = digits.slice(-4)
  return `(**) *****-${lastFour}`
}

/** Mascara remoteJid: "5511999991234@s.whatsapp.net" → "(**) *****-1234" */
export function maskRemoteJid(jid: string | null): string | null {
  if (!jid) return null
  const digits = jid.split('@')[0]?.replace(/\D/g, '') ?? ''
  if (digits.length < 4) return '***'
  const lastFour = digits.slice(-4)
  return `(**) *****-${lastFour}`
}

/**
 * Redige PII embutida em TEXTO LIVRE (ex.: `content` de eventos, `errorMessage`).
 * Diferente das máscaras acima (campos de formato conhecido), varre o texto e
 * substitui e-mails, UUIDs, tokens longos e sequências de telefone. Defense-in-depth
 * para campos que podem inadvertidamente carregar dados sensíveis antes de ir ao client.
 *
 * Ordem importa: e-mail → UUID → token longo → telefone (evita rótulo errado).
 */
export function redactPiiInText(text: string | null): string | null {
  if (!text) return text
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '[id]',
    )
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[token]')
    .replace(/\b\d{10,13}\b/g, '[telefone]')
}

// Limites para evitar payload gigante ao redigir JSON arbitrário (input/output de tools).
const REDACT_JSON_MAX_DEPTH = 6
const REDACT_JSON_MAX_STRING = 2000

/**
 * Redige PII em um valor JSON ARBITRÁRIO (objeto/array/primitivo), preservando a
 * estrutura — aplica `redactPiiInText` em cada folha string, passa números/bool/null
 * e recursa em objetos/arrays. Trunca strings longas e limita profundidade para não
 * vazar payloads enormes. Usado em input/output de steps antes de ir ao client.
 */
export function redactJson(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const truncated =
      value.length > REDACT_JSON_MAX_STRING
        ? `${value.slice(0, REDACT_JSON_MAX_STRING)}…`
        : value
    return redactPiiInText(truncated)
  }

  if (depth >= REDACT_JSON_MAX_DEPTH) return '[…]'

  if (Array.isArray(value)) {
    return value.map((item) => redactJson(item, depth + 1))
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = redactJson(item, depth + 1)
    }
    return result
  }

  return undefined
}
