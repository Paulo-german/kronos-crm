export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (phone.trimStart().startsWith('+') || digits.length > 11) return digits
  return `55${digits}`
}
