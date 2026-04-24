import { z } from 'zod'

export const costItemSchema = z.object({
  name: z.string().min(1, 'Informe um nome'),
  amount: z.coerce.number().min(0).finite(),
})

export const updateBusinessReportSchema = z.object({
  costItems: z.array(costItemSchema).max(50),
  aiMonthlyCostBrl: z.coerce.number().min(0).finite(),
  targetMarginPct: z.coerce.number().min(0).max(99),
})

// z.input<> preserva o tipo de entrada que o zodResolver espera com z.coerce
export type UpdateBusinessReportInput = z.input<typeof updateBusinessReportSchema>
