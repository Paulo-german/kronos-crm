import 'server-only'

/**
 * Mascara credenciais (API keys, tokens) antes de enviá-las ao client.
 * "abcd1234efgh5678" → "abcd••••••••5678"; valores curtos viram máscara completa.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`
}
