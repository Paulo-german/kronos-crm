export * from './models'
export * from './pricing'
// NUNCA: export * from './provider'
// Razão: provider.ts importa @ai-sdk/openai (server-only SDK). Re-exportá-lo aqui
// arrastaria o SDK para o bundle de qualquer componente client que importe de '@/_lib/ai'.
