import { getEvolutionConnectionState } from './instance-management'

/**
 * Valida que a instancia Evolution esta conectada antes de enviar mensagens.
 * Lanca erro explicito se desconectada — evita que mensagens sejam salvas
 * como "enviadas" quando na verdade nao foram entregues.
 */
export async function assertEvolutionConnected(instanceName: string): Promise<void> {
  const { state } = await getEvolutionConnectionState(instanceName)
  if (state !== 'open') {
    throw new Error(
      'WhatsApp desconectado. Reconecte o WhatsApp via QR Code antes de enviar mensagens.',
    )
  }
}
