/**
 * Edição de mensagens no Evolution Go ainda não é suportada oficialmente.
 * Mantemos a assinatura para satisfazer a interface WhatsAppProvider, mas
 * rejeitamos com erro explícito — o caller (action de edit) deve apresentar
 * mensagem de erro ao usuário.
 */
export async function editEvolutionGoMessage(): Promise<void> {
  throw new Error('Edição de mensagem não suportada no Evolution Go.')
}
