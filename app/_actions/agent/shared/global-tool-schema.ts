import { z } from 'zod'

/**
 * Constrói o discriminated union de global tools parametrizando apenas o shape
 * de `stepIds`. O runtime/UI exigem UUIDs (stepIdsSchema padrão); o formato de
 * export reusa o mesmo union mas com stepIds carregando ORDERS serializados,
 * que não são UUIDs — daí a parametrização (evita redefinir o union e drift).
 */
const buildGlobalToolSchema = (stepIdsSchema: z.ZodType<string[]>) => {
  const baseFields = {
    // id por instância — opcional para retrocompat com dados existentes (que não tinham).
    // Permite múltiplas instâncias do mesmo type no array global de um agente.
    id: z.string().uuid().optional(),
    trigger: z.string().min(1),
    // 'global' = disponível em todas as etapas (seção Ferramentas Globais do prompt)
    // 'steps'  = disponível apenas nas etapas listadas em stepIds
    scope: z.enum(['global', 'steps']).default('global'),
    stepIds: stepIdsSchema,
  }

  return z.discriminatedUnion('type', [
    // Transferência para humano — configurável por instância global
    z.object({
      ...baseFields,
      type: z.literal('hand_off_to_human'),
      notifyTarget: z
        .enum(['none', 'specific_number', 'deal_assignee'])
        .default('none'),
      specificPhone: z.string().optional(),
      notificationMessage: z.string().optional(),
    }),

    // Atualização de dados do contato — apenas trigger (campos inferidos pelo LLM)
    z.object({
      ...baseFields,
      type: z.literal('update_contact'),
    }),

    // Atualização de campos do negócio — espelha step-action-schema.update_deal
    z.object({
      ...baseFields,
      type: z.literal('update_deal'),
      allowedFields: z
        .array(z.enum(['title', 'value', 'priority', 'expectedCloseDate', 'notes']))
        .default([]),
      fixedPriority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      notesTemplate: z.string().optional(),
    }),

    // Criação de tarefa — espelha step-action-schema.create_task
    z.object({
      ...baseFields,
      type: z.literal('create_task'),
      title: z.string().min(1),
      dueDaysOffset: z.number().int().positive().optional(),
    }),
  ])
}

const stepIdsUuidSchema = z.array(z.string().uuid()).default([])
// Export: stepIds carrega orders serializados (ex: "0", "1"), não UUIDs.
const stepIdsExportSchema = z.array(z.string()).default([])

/**
 * globalToolSchema espelha estruturalmente os types equivalentes em
 * step-action-schema.ts. Os 4 types aqui são posição-agnósticos — podem
 * ser disparados em qualquer etapa do funil. Tools event-bound (move_deal,
 * list_availability, create_event, update_event) permanecem exclusivamente
 * em steps.
 *
 * ATENÇÃO: ao alterar o shape de qualquer type aqui, revise também o
 * compileGlobalTools em trigger/lib/prompt-step-compilers.ts, que faz
 * cast direto `as StepAction` confiando no espelhamento estrutural.
 */
export const globalToolSchema = buildGlobalToolSchema(stepIdsUuidSchema)

/**
 * Array de global tools — múltiplas instâncias do mesmo type são permitidas
 * (ex: dois hand_off_to_human com triggers distintos). O diferenciador semântico
 * é o campo `trigger`; a identidade é o `id` gerado pelo UI.
 */
export const globalToolsArraySchema = z.array(globalToolSchema)

// Variante para o formato de export/import: stepIds são orders serializados
// (string livre), não UUIDs. Validar com globalToolsArraySchema só DEPOIS do
// remap de orders → UUIDs novos (ver import-agent/remap-global-tools.ts).
export const exportGlobalToolSchema = buildGlobalToolSchema(stepIdsExportSchema)
export const exportGlobalToolsArraySchema = z.array(exportGlobalToolSchema)

export type GlobalTool = z.infer<typeof globalToolSchema>
export type GlobalToolType = GlobalTool['type']
export type ExportGlobalTool = z.infer<typeof exportGlobalToolSchema>
