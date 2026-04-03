// Limites de tamanho de arquivo
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_VIDEO_SIZE = 5 * 1024 * 1024 // 5MB

// Limites de quantidade por produto
export const MAX_IMAGES_PER_PRODUCT = 3
export const MAX_VIDEOS_PER_PRODUCT = 1

// Tipos MIME aceitos
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const
export const ALL_ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES] as const
