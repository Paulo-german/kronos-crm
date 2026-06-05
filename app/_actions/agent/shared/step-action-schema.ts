import { z } from 'zod'

const baseFields = {
  // id por instância — opcional para retrocompat com dados existentes (que não tinham).
  // O UI sempre gera ao adicionar; o runtime usa para indexação determinística quando
  // há múltiplas instâncias do mesmo type no mesmo step.
  id: z.string().uuid().optional(),
  trigger: z.string().min(1),
}

// Provider para preparação futura de Google Calendar
const schedulingProviderSchema = z
  .enum(['internal', 'google_calendar'])
  .default('internal')

// Duração de slots/eventos em minutos — valores discretos permitidos
const durationSchema = z.coerce
  .number()
  .pipe(
    z.union([
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(90),
      z.literal(120),
    ]),
  )

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
    allowedFields: z
      .array(z.enum(['title', 'value', 'priority', 'expectedCloseDate', 'notes']))
      .default([]),
    fixedPriority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    notesTemplate: z.string().optional(),
  }),
  z.object({
    ...baseFields,
    type: z.literal('create_task'),
    title: z.string().min(1),
    dueDaysOffset: z.number().int().positive().default(1),
  }),

  // Consulta slots disponíveis na agenda — config vem do step builder, não do LLM
  z.object({
    ...baseFields,
    type: z.literal('list_availability'),
    daysAhead: z.number().int().min(1).max(30).default(5),
    slotDuration: durationSchema.default(60),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .default('08:00'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .default('18:00'),
    provider: schedulingProviderSchema,
  }),

  // Cria evento (substitui create_appointment) — endDate calculado via duration
  // allowReschedule: se true, a tool update_event também é registrada no runtime
  z.object({
    ...baseFields,
    type: z.literal('create_event'),
    titleInstructions: z.string().min(1),
    duration: durationSchema.default(60),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .default('08:00'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .default('18:00'),
    allowReschedule: z.boolean().default(false),
    rescheduleInstructions: z.string().optional(),
    provider: schedulingProviderSchema,
  }),

  // Transfere para humano — notificação via WhatsApp é best-effort e configurável
  // notifyTarget com .default('none') garante retrocompatibilidade com steps existentes
  z.object({
    ...baseFields,
    type: z.literal('hand_off_to_human'),
    notifyTarget: z
      .enum(['none', 'specific_number', 'deal_assignee'])
      .default('none'),
    specificPhone: z.string().optional(),
    notificationMessage: z.string().optional(),
  }),

  // Agenda um serviço com profissional — disponível apenas quando agentMode = SERVICE | HYBRID
  z.object({
    ...baseFields,
    type: z.literal('create_appointment'),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    // test-chat não simula create_appointment hoje (ver build-mock-tool-set.ts) — bookingCreateDeal só tem efeito em produção
    bookingCreateDeal: z.boolean().default(true),
  }),
])

export type StepAction = z.infer<typeof stepActionSchema>
