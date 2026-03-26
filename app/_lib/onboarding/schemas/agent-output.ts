import { z } from 'zod'

// Schema flat para actions do blueprint — usa targetStagePosition (não UUID).
// Formato flat (objeto único com campos opcionais por tipo) é mais confiável
// para structured output de LLMs do que discriminatedUnion (oneOf no JSON Schema).
export const blueprintStepActionSchema = z.object({
  type: z.enum([
    'move_deal',
    'update_contact',
    'update_deal',
    'create_task',
    'list_availability',
    'create_event',
    'search_knowledge',
    'hand_off_to_human',
  ]),
  trigger: z.string().min(1),
  // move_deal
  targetStagePosition: z.number().int().min(0).optional(),
  // update_deal
  allowedFields: z
    .array(z.enum(['title', 'value', 'priority', 'expectedCloseDate', 'notes']))
    .optional(),
  fixedPriority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notesTemplate: z.string().optional(),
  allowedStatuses: z.array(z.enum(['WON', 'LOST'])).optional(),
  // create_task
  title: z.string().optional(),
  dueDaysOffset: z.number().int().positive().optional(),
  // list_availability / create_event
  daysAhead: z.number().int().min(1).max(7).optional(),
  slotDuration: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  // create_event
  titleInstructions: z.string().optional(),
  duration: z.number().optional(),
  allowReschedule: z.boolean().optional(),
  rescheduleInstructions: z.string().optional(),
  // hand_off_to_human
  notifyTarget: z.enum(['none', 'specific_number', 'deal_assignee']).optional(),
  specificPhone: z.string().optional(),
  notificationMessage: z.string().optional(),
})

export const agentStepBlueprintSchema = z.object({
  name: z.string().min(1),
  objective: z.string().min(1),
  keyQuestion: z.string().nullable(),
  messageTemplate: z.string().nullable(),
  order: z.number().int().min(0),
  actions: z.array(blueprintStepActionSchema).min(1),
})

export const agentStepsOutputSchema = z.object({
  steps: z.array(agentStepBlueprintSchema).min(3).max(5),
})

export const systemPromptOutputSchema = z.object({
  systemPrompt: z.string().min(100),
})

export type AgentStepsOutput = z.infer<typeof agentStepsOutputSchema>
export type SystemPromptOutput = z.infer<typeof systemPromptOutputSchema>
export type BlueprintStepActionGenerated = z.infer<typeof blueprintStepActionSchema>
