import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. Generate with: openssl rand -hex 32',
    )
  }
  const keyBuffer = Buffer.from(key, 'hex')
  if (keyBuffer.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (64 hex chars). Got ${keyBuffer.length} bytes.`,
    )
  }
  return keyBuffer
}

/**
 * Encripta um token de texto plano usando AES-256-GCM.
 * Retorna string no formato "iv:ciphertext:authTag" (hex).
 * IV é único por operação para segurança.
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${encrypted}:${authTag}`
}

/**
 * Decripta um token previamente encriptado com encryptToken.
 * Espera string no formato "iv:ciphertext:authTag" (hex).
 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey()
  const parts = encrypted.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }

  const [ivHex, ciphertext, authTagHex] = parts as [string, string, string]

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
