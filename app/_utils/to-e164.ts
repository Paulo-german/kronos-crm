import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'

/**
 * Normaliza qualquer formato de telefone para E.164 com `+` (ex: `+5511918255125`).
 *
 * Esta é a função canônica de STORAGE: todo telefone gravado no banco deve passar
 * por aqui antes de persistir, garantindo um único formato no banco. O consumo
 * (envio WhatsApp/JID) remove o `+` na hora de usar via `normalizePhoneToDigits`.
 *
 * Estratégia em duas camadas:
 * 1. Tenta validar/formatar com libphonenumber (formato canônico correto).
 * 2. Fallback que preserva os dígitos quando a lib não valida — em CRM é pior
 *    perder o telefone de um lead do que gravar um número não-canônico.
 *
 * Retorna `null` quando não há dígitos suficientes para um telefone plausível.
 */
export function toE164(
  rawPhone: string | null | undefined,
  defaultCountry: CountryCode = 'BR',
): string | null {
  if (!rawPhone) return null

  const parsed = parsePhoneNumberFromString(rawPhone, defaultCountry)
  if (parsed?.isValid()) return parsed.number

  // Fallback: preserva o dado mesmo sem validação canônica.
  // Números sem country code e com ≤ 11 dígitos assumem Brasil (+55).
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (rawPhone.trimStart().startsWith('+') || digits.length > 11)
    return `+${digits}`
  return `+55${digits}`
}
