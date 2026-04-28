// Versao da Graph API — deve estar em sync com META_API_VERSION ou o fallback de send-meta-message.ts
export const IG_API_VERSION = process.env.META_API_VERSION ?? 'v25.0'

// Limite de caracteres por mensagem no Instagram Direct (restricao da Graph API)
export const IG_MAX_TEXT_LENGTH = 1000

// Janela HUMAN_AGENT: 7 dias apos a ultima mensagem do cliente (em ms)
export const IG_HUMAN_AGENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

// Janela padrao de resposta: 24h apos a ultima mensagem do cliente (em ms)
export const IG_CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000
