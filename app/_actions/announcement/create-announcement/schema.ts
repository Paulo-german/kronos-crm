import { z } from 'zod'

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(120, 'Título muito longo'),
  body: z.string().min(1, 'Corpo é obrigatório'),
  // URL opcional — vazia é tratada como ausente
  actionUrl: z
    .string()
    .url('URL inválida')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value)),
  // Se vazio [] = todas as orgs ativas; se preenchido = orgs específicas
  targetOrgIds: z.array(z.string().uuid('ID de organização inválido')).default([]),
})

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>
