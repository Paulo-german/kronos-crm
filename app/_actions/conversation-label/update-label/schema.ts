import { z } from 'zod'
import { LABEL_COLORS } from '@/_lib/constants/label-colors'

const validColorKeys = LABEL_COLORS.map((color) => color.key) as [string, ...string[]]

export const updateLabelSchema = z.object({
  id: z.string().uuid('ID de etiqueta inválido'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(30, 'Máximo 30 caracteres').optional(),
  color: z.enum(validColorKeys, { error: () => ({ message: 'Cor inválida' }) }).optional(),
})

export type UpdateLabelInput = z.infer<typeof updateLabelSchema>
