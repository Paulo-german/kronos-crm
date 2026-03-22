export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export const ALL_ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES,
]

/** 5 MB — limite do WhatsApp para imagens */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/** 15 MB — limite conservador para documentos */
export const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024

/** String para o atributo `accept` do `<input type="file">` */
export const ACCEPTED_FILE_INPUT = ALL_ACCEPTED_MEDIA_TYPES.join(',')

export function isImageMimetype(mimetype: string): boolean {
  return mimetype.startsWith('image/')
}

export function getMaxSizeForMimetype(mimetype: string): number {
  return isImageMimetype(mimetype) ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE
}
