import { z } from 'zod'
import { createGoalSchema } from '@/_actions/goal/create-goal/schema'
import { updateGoalSchema } from '@/_actions/goal/update-goal/schema'

// Tipos de formulário usando z.input<> para compatibilidade com zodResolver + z.coerce
export type CreateGoalFormValues = z.input<typeof createGoalSchema>
export type UpdateGoalFormValues = z.input<typeof updateGoalSchema>
