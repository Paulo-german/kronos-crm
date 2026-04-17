import { AbortTaskRunError } from '@trigger.dev/sdk/v3'

export type ErrorClass = 'transient' | 'permanent'

// ---------------------------------------------------------------------------
// Helpers de inspeção de erro (privados)
// ---------------------------------------------------------------------------

/**
 * Extrai a mensagem de um erro desconhecido de forma segura.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

/**
 * Retorna o objeto de erro como Record para leitura de propriedades arbitrárias,
 * evitando acessos diretos em `unknown`.
 */
function asRecord(error: unknown): Record<string, unknown> {
  if (error !== null && typeof error === 'object') {
    return error as Record<string, unknown>
  }
  return {}
}

/**
 * Lê uma propriedade string de um objeto de erro desconhecido.
 */
function readStringProp(error: unknown, key: string): string {
  const obj = asRecord(error)
  const value = obj[key]
  return typeof value === 'string' ? value : ''
}

/**
 * Lê uma propriedade numérica de um objeto de erro desconhecido.
 */
function readNumberProp(error: unknown, key: string): number | undefined {
  const obj = asRecord(error)
  const value = obj[key]
  return typeof value === 'number' ? value : undefined
}

// ---------------------------------------------------------------------------
// Classificadores de tipo de erro
// ---------------------------------------------------------------------------

/**
 * Erros de timeout: ETIMEDOUT, ESOCKETTIMEDOUT, mensagem contendo "timeout",
 * ou code === 'TIMEOUT'.
 */
function isTimeoutError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  const code = readStringProp(error, 'code').toUpperCase()

  if (message.includes('timeout')) return true
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || code === 'TIMEOUT') return true

  // Checar cause aninhada (ex: erros encapsulados pelo Prisma ou fetch)
  const cause = asRecord(error)['cause']
  if (cause !== undefined) {
    const causeCode = readStringProp(cause, 'code').toUpperCase()
    if (causeCode === 'ETIMEDOUT' || causeCode === 'ESOCKETTIMEDOUT' || causeCode === 'TIMEOUT') {
      return true
    }
  }

  return false
}

/**
 * Erros de rate limit: status HTTP 429, mensagem contendo "rate limit",
 * ou code === 'RATE_LIMIT_EXCEEDED'.
 */
function isRateLimitError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  const code = readStringProp(error, 'code').toUpperCase()
  const status = readNumberProp(error, 'status') ?? readNumberProp(error, 'statusCode')

  if (status === 429) return true
  if (message.includes('rate limit') || message.includes('ratelimit')) return true
  if (code === 'RATE_LIMIT_EXCEEDED') return true

  return false
}

/**
 * Erros de lock de banco: P2034 (Prisma transaction conflict), "deadlock",
 * "lock timeout" — todos retentáveis com backoff.
 */
function isDbLockError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  const code = readStringProp(error, 'code').toUpperCase()

  // P2034: "Transaction failed due to a write conflict or a deadlock" (Prisma)
  if (code === 'P2034') return true
  if (message.includes('deadlock')) return true
  if (message.includes('lock timeout')) return true

  return false
}

/**
 * Erros de permissão: status HTTP 403, mensagem contendo "permission denied",
 * "forbidden" ou code === 'FORBIDDEN'.
 */
function isPermissionError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  const code = readStringProp(error, 'code').toUpperCase()
  const status = readNumberProp(error, 'status') ?? readNumberProp(error, 'statusCode')

  if (status === 403) return true
  if (message.includes('permission denied') || message.includes('forbidden')) return true
  if (code === 'FORBIDDEN') return true

  return false
}

/**
 * Erros de foreign key / registro inexistente: P2003 (FK constraint violada),
 * P2025 (record not found), ou mensagem contendo "foreign key".
 * Não faz sentido retentar — o dado simplesmente não existe.
 */
function isForeignKeyError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  const code = readStringProp(error, 'code').toUpperCase()

  // P2003: "Foreign key constraint failed on the field: …" (Prisma)
  if (code === 'P2003') return true
  // P2025: "An operation failed because it depends on one or more records that were required but not found" (Prisma)
  if (code === 'P2025') return true
  if (message.includes('foreign key')) return true

  return false
}

/**
 * Erros de escopo do agente: mensagem contendo "out of scope", "not allowed"
 * ou code === 'AGENT_SCOPE_ERROR'. Tool chamada fora das permissões do agente
 * não vai funcionar em retries.
 */
function isOutOfScopeError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  const code = readStringProp(error, 'code').toUpperCase()

  if (message.includes('out of scope') || message.includes('not allowed')) return true
  if (code === 'AGENT_SCOPE_ERROR') return true

  return false
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Classifica um erro de tool como transient (retentável) ou permanent (abortar).
 *
 * Default conservador: transient — prefere retentar a desistir prematuramente,
 * pois erros não reconhecidos podem ser transitórios de infraestrutura.
 */
export function classifyToolError(error: unknown): ErrorClass {
  if (isTimeoutError(error) || isRateLimitError(error) || isDbLockError(error)) {
    return 'transient'
  }
  if (isPermissionError(error) || isForeignKeyError(error) || isOutOfScopeError(error)) {
    return 'permanent'
  }
  return 'transient'
}

/**
 * Lança `AbortTaskRunError` se o erro for classificado como permanent,
 * interrompendo imediatamente todos os retries da task no Trigger.dev.
 *
 * Se o erro for transient, retorna normalmente — o chamador deve deixar
 * o erro propagar para que o retry automático da task (ou do `retry.onThrow`)
 * o reprocesse.
 *
 * Padrão de uso no Agent 1:
 * ```ts
 * try {
 *   return await retry.onThrow(() => executeTool(name, input), { maxAttempts: 2 })
 * } catch (err) {
 *   abortIfPermanent(err, { tool: name }) // permanent → abort
 *   throw err                              // transient → deixa retry da task agir
 * }
 * ```
 */
export function abortIfPermanent(
  error: unknown,
  context: { tool: string },
): void {
  const errorClass = classifyToolError(error)
  if (errorClass === 'permanent') {
    throw new AbortTaskRunError(
      `Permanent failure in tool ${context.tool}: ${extractErrorMessage(error)}`,
    )
  }
}
