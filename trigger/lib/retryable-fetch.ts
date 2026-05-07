import { retry } from '@trigger.dev/sdk/v3'

/**
 * Retorna um `typeof fetch` que envolve cada request com retry automático.
 *
 * Deve ser instanciado DENTRO de uma task do Trigger.dev — retry.fetch não
 * funciona fora desse contexto (ex: Server Actions). O fetcher resultante
 * é repassado como parâmetro opcional pelos callers; callers fora do Trigger.dev
 * usam o default `fetch` global e nunca chamam esta função.
 *
 * Política:
 * - 429 e 5xx: 3 tentativas com backoff exponencial (500ms → 5s, randomizado)
 * - Timeout: 3 tentativas, 15s por request, fator 1.8
 */
export function createRetryableFetch(): typeof fetch {
  return ((url: string, init?: RequestInit) =>
    retry.fetch(url, {
      ...init,
      retry: {
        byStatus: {
          '429': {
            strategy: 'backoff',
            maxAttempts: 3,
            factor: 2,
            minTimeoutInMs: 500,
            maxTimeoutInMs: 5000,
            randomize: true,
          },
          '500-599': {
            strategy: 'backoff',
            maxAttempts: 3,
            factor: 2,
            minTimeoutInMs: 500,
            maxTimeoutInMs: 5000,
            randomize: true,
          },
        },
        timeout: {
          maxAttempts: 3,
          factor: 1.8,
          minTimeoutInMs: 500,
          maxTimeoutInMs: 5000,
        },
      },
      timeoutInMs: 15_000,
    })) as typeof fetch
}
