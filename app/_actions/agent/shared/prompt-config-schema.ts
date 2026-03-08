import { z } from 'zod'

export const promptConfigSchema = z
  .object({
    role: z.enum(['sdr', 'closer', 'support', 'receptionist', 'custom']),
    roleCustom: z.string().optional(),
    companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
    companyDescription: z.string().min(1, 'Descrição da empresa é obrigatória'),
    targetAudience: z.string().optional(),
    tone: z.enum(['formal', 'professional', 'friendly', 'casual']),
    responseLength: z.enum(['short', 'medium', 'detailed']),
    useEmojis: z.boolean(),
    language: z.enum(['pt-BR', 'en', 'es', 'auto']),
    guidelines: z.array(z.string()),
    restrictions: z.array(z.string()),
  })
  .refine(
    (data) =>
      data.role !== 'custom' ||
      (data.roleCustom && data.roleCustom.trim().length > 0),
    {
      message: 'Descreva o papel personalizado do agente',
      path: ['roleCustom'],
    },
  )

export type PromptConfig = z.infer<typeof promptConfigSchema>
