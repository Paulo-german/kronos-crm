/**
 * Extrai e formata telefone de um JID do WhatsApp.
 * Ex: "5511999999999@s.whatsapp.net" → "+55 (11) 99999-9999"
 *
 * Arquivo separado de instance-management.ts para poder ser importado em Client Components.
 */
export function formatPhoneFromJid(jid: string): string {
  const raw = jid.split('@')[0]
  if (!raw || raw.length < 10) return raw

  // Formato brasileiro: 55 + DDD(2) + Número(8-9)
  if (raw.startsWith('55') && raw.length >= 12) {
    const country = raw.slice(0, 2)
    const ddd = raw.slice(2, 4)
    const number = raw.slice(4)
    const formattedNumber =
      number.length === 9
        ? `${number.slice(0, 5)}-${number.slice(5)}`
        : `${number.slice(0, 4)}-${number.slice(4)}`
    return `+${country} (${ddd}) ${formattedNumber}`
  }

  // Formato genérico
  return `+${raw}`
}
