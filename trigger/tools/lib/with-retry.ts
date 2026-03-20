import { logger } from '@trigger.dev/sdk/v3'

const BACKOFF_MS = [200, 500, 1000]

// Prisma error codes that indicate transient failures (pool exhausted, timeout, etc.)
const TRANSIENT_PRISMA_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
  'P2024', // Connection pool timeout
])

const TRANSIENT_MESSAGES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'fetch failed',
  'socket hang up',
]

export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as Record<string, unknown>

  // PrismaClientKnownRequestError
  if (err.code && typeof err.code === 'string' && TRANSIENT_PRISMA_CODES.has(err.code)) {
    return true
  }

  // PrismaClientInitializationError with retryable flag
  if (err.name === 'PrismaClientInitializationError' && err.retryable === true) {
    return true
  }

  // PrismaClientUnknownRequestError — almost always transient
  if (err.name === 'PrismaClientUnknownRequestError') {
    return true
  }

  // Generic errors with transient network messages
  const message = err.message
  if (typeof message === 'string') {
    return TRANSIENT_MESSAGES.some((pattern) => message.includes(pattern))
  }

  return false
}

export async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!isTransientError(error) || attempt === BACKOFF_MS.length) {
        throw error
      }

      const delay = BACKOFF_MS[attempt]
      logger.warn(`${label}: transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${BACKOFF_MS.length})`, {
        error,
      })
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export async function safeBestEffort(fn: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await fn()
  } catch (error) {
    logger.warn(`${label}: best-effort operation failed, skipping`, { error })
  }
}
