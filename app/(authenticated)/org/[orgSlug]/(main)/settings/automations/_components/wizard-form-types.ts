import { z } from 'zod'
import { AutomationTrigger, AutomationAction } from '@prisma/client'
import { automationConditionSchema } from '@/_actions/automation/create-automation/schema'

// Schema do formulário sem o superRefine (validação cross-field ocorre no servidor).
// Necessário pois o zodResolver do react-hook-form é incompatível com schemas superRefine
// que têm tipos genéricos internos complexos.
// Zod v4: required_error foi renomeado para error
export const automationFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  description: z.string().trim().max(500).optional(),
  triggerType: z.nativeEnum(AutomationTrigger, { error: 'Selecione o tipo de gatilho' }),
  triggerConfig: z.record(z.string(), z.unknown()),
  conditions: z.array(automationConditionSchema).max(5).default([]),
  actionType: z.nativeEnum(AutomationAction, { error: 'Selecione o tipo de ação' }),
  actionConfig: z.record(z.string(), z.unknown()),
})

// Usa z.input<> para obter o tipo de entrada (antes das transformações como .default())
// Isso garante compatibilidade com o zodResolver que recebe o formulário antes de parsear
export type AutomationFormValues = z.input<typeof automationFormSchema>

// Tipo canônico para dados completos de edição/duplicação no wizard.
// Contém os campos de configuração que AutomationListItemDto não carrega.
export interface AutomationWizardEditData {
  id: string
  name: string
  description: string | null
  isActive: boolean
  triggerType: AutomationTrigger
  triggerConfig: Record<string, unknown>
  conditions: unknown[]
  actionType: AutomationAction
  actionConfig: Record<string, unknown>
}
