import { z } from 'zod'

export const toggleSuperAdminSchema = z.object({
  userId:       z.string().uuid(),
  adminKey:     z.string().min(1, 'Senha obrigatória.'),
  confirmation: z.string().min(1, 'Confirmação obrigatória.'),
})
