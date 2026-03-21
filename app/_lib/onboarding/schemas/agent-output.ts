import { z } from 'zod'

// Schema para actions do blueprint (usa targetStagePosition, nao targetStage UUID)
// Compativel com BlueprintStepAction de app/_lib/onboarding/blueprints/types.ts
const blueprintStepActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('move_deal'),
    trigger: z.string().min(1),
    targetStagePosition: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('update_contact'),
    trigger: z.string().min(1),
  }),
  z.object({
    type: z.literal('update_deal'),
    trigger: z.string().min(1),
    allowedFields: z
      .array(z.enum(['title', 'value', 'priority', 'expectedCloseDate', 'notes']))
      .optional(),
    fixedPriority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    notesTemplate: z.string().optional(),
    allowedStatuses: z.array(z.enum(['WON', 'LOST'])).optional(),
  }),
  z.object({
    type: z.literal('create_task'),
    trigger: z.string().min(1),
    title: z.string().min(1),
    dueDaysOffset: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('list_availability'),
    trigger: z.string().min(1),
    daysAhead: z.number().int().min(1).max(7).optional(),
    slotDuration: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }),
  z.object({
    type: z.literal('create_event'),
    trigger: z.string().min(1),
    titleInstructions: z.string().optional(),
    duration: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    allowReschedule: z.boolean().optional(),
    rescheduleInstructions: z.string().optional(),
  }),
  z.object({
    type: z.literal('search_knowledge'),
    trigger: z.string().min(1),
  }),
  z.object({
    type: z.literal('hand_off_to_human'),
    trigger: z.string().min(1),
    notifyTarget: z.enum(['none', 'specific_number', 'deal_assignee']).optional(),
    specificPhone: z.string().optional(),
    notificationMessage: z.string().optional(),
  }),
])

export const agentStepBlueprintSchema = z.object({
  name: z.string().min(1),
  objective: z.string().min(1),
  keyQuestion: z.string().nullable(),
  messageTemplate: z.string().nullable(),
  order: z.number().int().min(0),
  actions: z.array(blueprintStepActionSchema),
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
export { blueprintStepActionSchema }
