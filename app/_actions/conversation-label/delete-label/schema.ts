import { z } from 'zod'

export const deleteLabelSchema = z.object({
  id: z.string().uuid('ID de etiqueta inválido'),
})

export type DeleteLabelInput = z.infer<typeof deleteLabelSchema>
