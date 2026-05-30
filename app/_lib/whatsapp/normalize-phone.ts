import 'server-only'

// Converte qualquer formato para dígitos com country code.
// Suporta E.164 (+5511999999999), dígitos puros (11999999999) e formatos mascarados.
// Números sem country code e com ≤ 11 dígitos assumem Brasil (+55).
function toInternationalDigits(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (rawPhone.trimStart().startsWith('+') || digits.length > 11) return digits
  return `55${digits}`
}

export function normalizePhoneToJid(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null
  const digits = toInternationalDigits(rawPhone)
  if (!digits) return null
  return `${digits}@s.whatsapp.net`
}

export function normalizePhoneToDigits(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null
  return toInternationalDigits(rawPhone)
}
