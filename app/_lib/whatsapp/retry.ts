const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 1000

interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
}

/**
 * Executa uma função async com retry e backoff exponencial.
 * Retenta apenas erros 5xx ou de rede — erros 4xx não são retentados.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const baseDelay = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Não retentar erros 4xx (client error) — são definitivos
      if (isClientError(lastError.message)) throw lastError

      // Última tentativa: propagar erro
      if (attempt === maxAttempts) throw lastError

      // Backoff exponencial: 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

function isClientError(message: string): boolean {
  return /\(4\d{2}\)/.test(message)
}
