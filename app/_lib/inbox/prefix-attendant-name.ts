/**
 * Prefixa o nome do remetente na mensagem usando formato bold do WhatsApp.
 * O prefixo e transiente — aplicado apenas no envio, nunca salvo no banco.
 */
export function prefixAttendantName(
  text: string,
  senderName: string | null | undefined,
  enabled: boolean,
): string {
  if (!enabled || !senderName) return text
  return `*${senderName}:*\n${text}`
}
