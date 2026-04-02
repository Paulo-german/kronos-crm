import { z } from 'zod'
import { LABEL_COLORS } from '@/_lib/constants/label-colors'

const validColorKeys = LABEL_COLORS.map((color) => color.key) as [string, ...string[]]

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(30, 'Máximo 30 caracteres'),
  color: z.enum(validColorKeys, { error: () => ({ message: 'Cor inválida' }) }),
})

export type CreateLabelInput = z.infer<typeof createLabelSchema>
