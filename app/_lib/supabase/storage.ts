import { supabaseAdmin } from './admin'

const BUCKET = 'agent-media'

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
 * Upload de mídia para Supabase Storage (bucket agent-media).
 * Path: {orgId}/{conversationId}/{messageId}.{ext}
 */
export async function uploadMediaToStorage({
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

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimetype,
      upsert: true,
    })

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`)
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  return {
    publicUrl: urlData.publicUrl,
    storagePath,
  }
}
