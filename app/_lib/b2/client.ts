import { S3Client } from '@aws-sdk/client-s3'

/**
 * Backblaze B2 client (S3-compatible).
 * Singleton lazy-initialized no primeiro uso para evitar erros em build sem env vars.
 *
 * Env vars necessárias:
 *   B2_KEY_ID          — Application Key ID
 *   B2_APP_KEY         — Application Key
 *   B2_ENDPOINT        — S3 endpoint (ex: https://s3.us-east-005.backblazeb2.com)
 *   B2_REGION          — Região (ex: us-east-005)
 */
let instance: S3Client | null = null

export function getB2Client(): S3Client {
  if (instance) return instance

  const keyId = process.env.B2_KEY_ID
  const appKey = process.env.B2_APP_KEY
  const endpoint = process.env.B2_ENDPOINT
  const region = process.env.B2_REGION

  if (!keyId || !appKey || !endpoint || !region) {
    throw new Error(
      'Backblaze B2 não configurado. Defina B2_KEY_ID, B2_APP_KEY, B2_ENDPOINT e B2_REGION.',
    )
  }

  instance = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: appKey,
    },
  })

  return instance
}
