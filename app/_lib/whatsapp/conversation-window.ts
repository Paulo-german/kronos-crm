// Janela de conversa do WhatsApp: cliente tem 24h a partir da ultima mensagem enviada
// para receber mensagens de texto livre. Apos esse periodo, apenas templates aprovados podem ser enviados.
const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Retorna true se a janela de 24h ainda esta aberta.
 * Retorna false se o cliente nunca enviou mensagem ou se a janela expirou.
 */
export function isConversationWindowOpen(lastCustomerMessageAt: Date | null): boolean {
  if (!lastCustomerMessageAt) return false
  return Date.now() - lastCustomerMessageAt.getTime() < WINDOW_DURATION_MS
}

/**
 * Retorna o timestamp de expiracao da janela, ou null se nao houver mensagem do cliente.
 */
export function getWindowExpiresAt(lastCustomerMessageAt: Date | null): Date | null {
  if (!lastCustomerMessageAt) return null
  return new Date(lastCustomerMessageAt.getTime() + WINDOW_DURATION_MS)
}
