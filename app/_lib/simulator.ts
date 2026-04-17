/**
 * Constantes compartilhadas entre actions, data-access e pipeline para identificar
 * recursos pertencentes ao modo Simulator (conversa de teste dentro do inbox).
 *
 * Não confundir com o valor `'simulator'` presente em unions de `provider` — aquele
 * é discriminador de rota no `processAgentMessage` e permanece inline no tipo.
 */

// Phone virtual do contato Simulator. Também usado em filtros de exclusão
// (contacts.none / contacts.some) em queries de deals e dashboard.
export const SIMULATOR_CONTACT_PHONE = 'simulator'

// JID fictício atribuído à conversa — nunca sai para provider externo.
export const SIMULATOR_REMOTE_JID = 'simulator@s.whatsapp.net'

// Título atribuído ao deal criado automaticamente junto da conversa simulada.
export const SIMULATOR_DEAL_TITLE = 'Negociação Simulada'
