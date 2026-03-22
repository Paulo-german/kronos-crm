import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getB2Client } from './client'

const BUCKET = process.env.B2_BUCKET_NAME ?? 'kronos-media'

interface UploadMediaParams {
  organizationId: string
  conversationId: string
  messageId: string
  base64: string
  mimetype: string
  fileName?: string
}

interface UploadMediaResult {
  publicUrl: string
  storagePath: string
}

const MIME_TO_EXT: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'audio/x-m4a': 'm4a',
  'audio/ogg; codecs=opus': 'ogg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

function getExtension(mimetype: string, fileName?: string): string {
  if (fileName) {
    const dotIndex = fileName.lastIndexOf('.')
    if (dotIndex > 0) return fileName.slice(dotIndex + 1).toLowerCase()
  }
  return MIME_TO_EXT[mimetype] ?? 'bin'
}

/**
 * Upload de mídia para Backblaze B2 (S3-compatible).
 * Path: {orgId}/{conversationId}/{messageId}.{ext}
 *
 * Requer B2_PUBLIC_URL no env (ex: https://f004.backblazeb2.com/file/kronos-media)
 */
export async function uploadMediaToB2({
  organizationId,
  conversationId,
  messageId,
  base64,
  mimetype,
  fileName,
}: UploadMediaParams): Promise<UploadMediaResult> {
  const ext = getExtension(mimetype, fileName)
  const storagePath = `${organizationId}/${conversationId}/${messageId}.${ext}`

  const buffer = Buffer.from(base64, 'base64')

  await getB2Client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      Body: buffer,
      ContentType: mimetype,
    }),
  )

  const publicBaseUrl = process.env.B2_PUBLIC_URL
  if (!publicBaseUrl) {
    throw new Error('B2_PUBLIC_URL não configurado.')
  }

  const publicUrl = `${publicBaseUrl}/${storagePath}`

  return { publicUrl, storagePath }
}
