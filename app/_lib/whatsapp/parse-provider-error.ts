export type ProviderDeliveryError = {
  code?: number
  title?: string
  message?: string
  [key: string]: string | number | undefined
}

/**
 * Extrai informacoes estruturadas de erro a partir de exceptions lancados pelos providers.
 *
 * Padroes reconhecidos:
 *  - Meta: "Meta Graph API sendText failed (400): {\"error\":{\"code\":131047,...}}"
 *  - Evolution: "Evolution API sendText failed (404): ..."
 *  - Z-API: "Z-API sendText failed (400): ..."
 *  - Mensagens PT-BR diretas: "Este número não possui WhatsApp..."
 */
export function parseProviderError(error: unknown): ProviderDeliveryError {
  const msg = error instanceof Error ? error.message : String(error)

  // Extrair HTTP status code do padrao "(NNN)"
  const statusMatch = msg.match(/\((\d{3})\)/)
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined

  // Tentar parsear JSON body de erros Meta Graph API
  const jsonMatch = msg.match(/:\s*(\{.+\})\s*$/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed.error) {
        return {
          code: parsed.error.code ?? statusCode,
          title: parsed.error.title,
          message: parsed.error.error_user_msg ?? parsed.error.message,
        }
      }
    } catch {
      // JSON invalido — continuar com fallback
    }
  }

  return {
    code: statusCode,
    message: msg,
  }
}
