import { FieldType } from '@prisma/client'
import { onlyNumbers } from '@/_lib/utils'
import { CUSTOM_FIELD_VALUE_MAX } from '@/_lib/constants/field-limits'
import type { FieldOption } from './types'

/**
 * Faz o cast seguro do `options` cru do Prisma (Json) para `FieldOption[] | null`,
 * sem vazar `JsonValue` para o DTO. Só aceita arrays de objetos `{ label, value }`
 * com ambos string — qualquer outro shape vira `null`.
 */
export function parseFieldOptions(raw: unknown): FieldOption[] | null {
  if (!Array.isArray(raw)) {
    return null
  }

  const options: FieldOption[] = []
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      'label' in item &&
      'value' in item &&
      typeof item.label === 'string' &&
      typeof item.value === 'string'
    ) {
      options.push({ label: item.label, value: item.value })
    }
  }

  return options
}

// Regex simples de URL/email — validação forte fica no Zod do schema da action,
// aqui garantimos apenas que o valor serializado é coerente com o tipo.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface SerializeResult {
  ok: boolean
  /** Valor serializado para persistir (string) quando ok. `null` significa campo limpo. */
  value: string | null
  /** Mensagem de erro quando `ok === false`. */
  error?: string
}

/**
 * Serializa um valor de campo personalizado para `string | null` (formato de persistência).
 * Valida coerência com o tipo. Valor vazio/null → `{ ok: true, value: null }` (limpa o campo).
 *
 * - NUMBER → string numérica normalizada
 * - DATE → ISO (YYYY-MM-DD ou ISO completo)
 * - SELECT → deve pertencer às opções
 * - CPF → persiste apenas os 11 dígitos (sem máscara)
 * - EMAIL/URL/PHONE/TEXT → trim, validação de formato quando aplicável
 */
export function serializeFieldValue(
  type: FieldType,
  raw: string | null | undefined,
  options?: FieldOption[] | null,
): SerializeResult {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''

  if (trimmed === '') {
    return { ok: true, value: null }
  }

  const maxLength = CUSTOM_FIELD_VALUE_MAX[type]
  if (maxLength !== undefined && trimmed.length > maxLength) {
    return { ok: false, value: null, error: `Máximo de ${maxLength} caracteres.` }
  }

  switch (type) {
    case FieldType.NUMBER: {
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) {
        return { ok: false, value: null, error: 'Valor numérico inválido.' }
      }
      return { ok: true, value: String(parsed) }
    }

    case FieldType.DATE: {
      const date = new Date(trimmed)
      if (Number.isNaN(date.getTime())) {
        return { ok: false, value: null, error: 'Data inválida.' }
      }
      return { ok: true, value: date.toISOString() }
    }

    case FieldType.SELECT: {
      const allowed = options ?? []
      const match = allowed.some((option) => option.value === trimmed)
      if (!match) {
        return { ok: false, value: null, error: 'Opção selecionada inválida.' }
      }
      return { ok: true, value: trimmed }
    }

    case FieldType.EMAIL: {
      if (!EMAIL_REGEX.test(trimmed)) {
        return { ok: false, value: null, error: 'Email inválido.' }
      }
      return { ok: true, value: trimmed }
    }

    case FieldType.URL: {
      try {
        const url = new URL(trimmed)
        // Bloqueia javascript:, data:, etc — previne XSS se o valor for usado em <a href>
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return { ok: false, value: null, error: 'URL deve usar http ou https.' }
        }
        return { ok: true, value: url.toString() }
      } catch {
        return { ok: false, value: null, error: 'URL inválida.' }
      }
    }

    case FieldType.CPF: {
      const digits = onlyNumbers(trimmed)
      if (digits.length !== 11) {
        return { ok: false, value: null, error: 'CPF deve ter 11 dígitos.' }
      }
      // Persiste apenas os dígitos, sem máscara
      return { ok: true, value: digits }
    }

    case FieldType.PHONE:
    case FieldType.TEXT:
      return { ok: true, value: trimmed }

    default:
      return { ok: true, value: trimmed }
  }
}

/**
 * Converte o valor persistido (`string | null`) de volta ao formato de exibição/edição.
 * Para DATE retorna o formato `YYYY-MM-DD` (compatível com `<input type="date">`),
 * demais tipos retornam o próprio valor.
 */
export function parseFieldValue(type: FieldType, stored: string | null): string {
  if (stored === null || stored === '') {
    return ''
  }

  if (type === FieldType.DATE) {
    const date = new Date(stored)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    // ISO completo → recorta para o componente de data nativo
    return date.toISOString().slice(0, 10)
  }

  return stored
}
