import { z } from 'zod'

const baseFields = {
  trigger: z.string().min(1),
}

export const stepActionSchema = z.discriminatedUnion('type', [
  z.object({
    ...baseFields,
    type: z.literal('move_deal'),
    targetStage: z.string().uuid(),
  }),
  z.object({
    ...baseFields,
    type: z.literal('update_contact'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('update_deal'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('create_task'),
    title: z.string().min(1),
    dueDaysOffset: z.number().int().positive().optional(),
  }),
  z.object({
    ...baseFields,
    type: z.literal('create_appointment'),
    title: z.string().min(1),
  }),
  z.object({
    ...baseFields,
    type: z.literal('search_knowledge'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('hand_off_to_human'),
  }),
])

export type StepAction = z.infer<typeof stepActionSchema>
