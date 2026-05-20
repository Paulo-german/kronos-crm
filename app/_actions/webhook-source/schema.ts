import { z } from 'zod'

export const webhookEventTypeSchema = z.enum([
  'NEW_CONTACT',
  'UPDATE_CONTACT',
  'NEW_DEAL',
  'UPDATE_DEAL',
  'DEAL_CLOSED',
])

export const webhookPlatformSchema = z.enum([
  'GENERIC',
  'SHOPIFY',
  'NUVEM_SHOP',
  'HOTMART',
  'GOOGLE_FORMS',
  'OTHER',
])

export const webhookLogStatusSchema = z.enum(['PROCESSED', 'ERROR', 'IGNORED'])

// Chaves canônicas que o CRM aceita no fieldMapping — keys do destino, não do payload
export const fieldMappingKeySchema = z.enum([
  'name',
  'email',
  'phone',
  'cpf',
  'companyName',
  'dealTitle',
  'dealValue',
  'dealNotes',
  'dealStageId',
])

export type FieldMappingKey = z.infer<typeof fieldMappingKeySchema>

const VALID_MAPPING_KEYS = new Set(fieldMappingKeySchema.options)

// Mapa { canonicalKey: 'dot.path.no.payload' } — paths sempre strings não-vazias
// z.record(z.string()) em vez de z.record(z.enum()) porque no Zod v4 o enum-key record
// exige TODAS as chaves do enum presentes, o que quebraria formulários com mapeamento vazio
export const fieldMappingSchema = z
  .record(z.string(), z.string().trim().min(1, 'O path do payload é obrigatório'))
  .refine(
    (obj) => Object.keys(obj).length > 0,
    { message: 'Adicione pelo menos um campo mapeado' },
  )
  .refine(
    (obj) => Object.keys(obj).every((k) => VALID_MAPPING_KEYS.has(k as FieldMappingKey)),
    { message: 'Chave de mapeamento inválida' },
  )

export const createWebhookSourceSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120),
  platform: webhookPlatformSchema.default('GENERIC'),
  eventType: webhookEventTypeSchema,
  fieldMapping: fieldMappingSchema,
  isActive: z.boolean().default(true),
})

export const updateWebhookSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  platform: webhookPlatformSchema.optional(),
  eventType: webhookEventTypeSchema.optional(),
  fieldMapping: fieldMappingSchema.optional(),
  isActive: z.boolean().optional(),
})

export const deleteWebhookSourceSchema = z.object({
  id: z.string().uuid(),
})

export const regenerateWebhookTokenSchema = z.object({
  id: z.string().uuid(),
})

export const getWebhookLogsSchema = z.object({
  webhookSourceId: z.string().uuid(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  status: z.array(webhookLogStatusSchema).optional(),
  since: z.coerce.date().optional(),
})

export const replayWebhookLogSchema = z.object({
  logId: z.string().uuid(),
})

export interface WebhookSourceDto {
  id: string
  name: string
  token: string
  platform: z.infer<typeof webhookPlatformSchema>
  eventType: z.infer<typeof webhookEventTypeSchema>
  fieldMapping: Record<string, string>
  isActive: boolean
  hasSecretKey: boolean
  lastReceivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  stats: { totalEvents: number; successRate: number }
}

export interface WebhookLogDto {
  id: string
  webhookSourceId: string
  receivedAt: Date
  status: z.infer<typeof webhookLogStatusSchema>
  errorMessage: string | null
  contactId: string | null
  dealId: string | null
  externalEventId: string | null
  payload: unknown
  resolvedData: unknown
}
