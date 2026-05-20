import { z } from 'zod'
import { LifecycleStage } from '@prisma/client'
import { stepActionSchema } from './step-action-schema'

export const autoTaskItemSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  dueInDays: z.number().int().positive('Prazo deve ser positivo'),
})
export type AutoTaskItem = z.infer<typeof autoTaskItemSchema>

export const stepFieldsSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  objective: z.string().min(1, 'Objetivo é obrigatório'),
  actions: z.array(stepActionSchema).optional().default([]),
  keyQuestion: z.string().max(500).optional(),
  messageTemplate: z.string().max(1000).optional(),
  lifecycleTrigger: z.nativeEnum(LifecycleStage).nullable().optional(),
  lifecycleDealPipelineId: z.string().uuid().nullable().optional(),
  autoDealStageId: z.string().uuid().nullable().optional(),
  autoTasks: z.array(autoTaskItemSchema).nullable().optional(),
})

export type StepFields = z.infer<typeof stepFieldsSchema>
