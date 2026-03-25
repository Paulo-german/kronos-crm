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

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/3gpp',
  'video/quicktime',
]

export const ALL_ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
]

/** 5 MB — limite do WhatsApp para imagens */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/** 15 MB — limite conservador para documentos */
export const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024

/** 20 MB — limite do WhatsApp para videos */
export const MAX_VIDEO_SIZE = 20 * 1024 * 1024

/** String para o atributo `accept` do `<input type="file">` */
export const ACCEPTED_FILE_INPUT = ALL_ACCEPTED_MEDIA_TYPES.join(',')

export function isImageMimetype(mimetype: string): boolean {
  return mimetype.startsWith('image/')
}

export function isVideoMimetype(mimetype: string): boolean {
  return mimetype.startsWith('video/')
}

export function getMaxSizeForMimetype(mimetype: string): number {
  if (isImageMimetype(mimetype)) return MAX_IMAGE_SIZE
  if (isVideoMimetype(mimetype)) return MAX_VIDEO_SIZE
  return MAX_DOCUMENT_SIZE
}
