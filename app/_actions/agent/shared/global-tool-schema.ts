import { z } from 'zod'

const baseFields = {
  // id por instância — opcional para retrocompat com dados existentes (que não tinham).
  // Permite múltiplas instâncias do mesmo type no array global de um agente.
  id: z.string().uuid().optional(),
  trigger: z.string().min(1),
}

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
export const globalToolSchema = z.discriminatedUnion('type', [
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
    allowedStatuses: z.array(z.enum(['WON', 'LOST'])).default([]),
  }),

  // Criação de tarefa — espelha step-action-schema.create_task
  z.object({
    ...baseFields,
    type: z.literal('create_task'),
    title: z.string().min(1),
    dueDaysOffset: z.number().int().positive().optional(),
  }),
])

/**
 * Array de global tools — múltiplas instâncias do mesmo type são permitidas
 * (ex: dois hand_off_to_human com triggers distintos). O diferenciador semântico
 * é o campo `trigger`; a identidade é o `id` gerado pelo UI.
 */
export const globalToolsArraySchema = z.array(globalToolSchema)

export type GlobalTool = z.infer<typeof globalToolSchema>
export type GlobalToolType = GlobalTool['type']
