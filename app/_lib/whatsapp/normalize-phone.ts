import 'server-only'

/**
 * Normaliza um telefone bruto para o formato remoteJid do WhatsApp.
 * Aplica prefixo 55 (Brasil) para números com 10-11 dígitos.
 * Retorna null para telefones inválidos (menos de 10 dígitos).
 */
export function normalizePhoneToJid(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length < 10) return null
  const withCountry = digits.length <= 11 ? `55${digits}` : digits
  return `${withCountry}@s.whatsapp.net`
}
