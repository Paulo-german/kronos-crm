import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
})
