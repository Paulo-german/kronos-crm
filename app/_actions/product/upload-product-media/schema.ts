import { z } from 'zod'
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  ALL_ACCEPTED_TYPES,
} from '@/_lib/product-media-constants'

export const createMediaUploadUrlSchema = z.object({
  productId: z.string().uuid(),
  fileName: z.string().min(1),
  mimeType: z.string().refine(
    (mime) => (ALL_ACCEPTED_TYPES as readonly string[]).includes(mime),
    'Tipo de arquivo não suportado.',
  ),
  fileSize: z.number().int().positive(),
})

export const confirmMediaUploadSchema = z.object({
  productId: z.string().uuid(),
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().refine(
    (mime) => (ALL_ACCEPTED_TYPES as readonly string[]).includes(mime),
    'Tipo de arquivo não suportado.',
  ),
  fileSize: z.number().int().positive(),
})

export function isImageType(mimeType: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)
}

export function isVideoType(mimeType: string): boolean {
  return (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(mimeType)
}
