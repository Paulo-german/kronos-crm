// -----------------------------------------------------------------------------
// Evolution Go — Webhook & Credentials Types
// -----------------------------------------------------------------------------

import { z } from 'zod'

export interface EvolutionGoCredentials {
  apiUrl: string
  /** Token por instância (Evolution Go usa token de instância, não chave global). */
  apiToken: string
}

/**
 * Envelope genérico de webhook do Evolution Go.
 * `data` é discriminado por `event` — schemas Zod abaixo fazem o parse defensivo.
 */
export interface EvolutionGoWebhookPayload {
  event: string
  instance: string
  data: unknown
}

// -----------------------------------------------------------------------------
// Event payloads (defensivos — Zod safeParse no handler)
// -----------------------------------------------------------------------------

// Evolution Go (Go/whatsmeow) usa estrutura com PascalCase no campo Info
export const evolutionGoInfoSchema = z.object({
  ID: z.string(),
  Chat: z.string(),
  Sender: z.string().optional(),
  IsFromMe: z.boolean(),
  IsGroup: z.boolean().optional(),
  PushName: z.string().optional(),
  // Go time.Time serializado como RFC3366 string ou unix epoch
  Timestamp: z.union([z.string(), z.number()]).optional(),
  Type: z.string().optional(),
  // JIDs alternativos para resolver @lid → @s.whatsapp.net (multi-device protocol)
  SenderAlt: z.string().optional(),
  RecipientAlt: z.string().optional(),
})

export const evolutionGoMediaSchema = z.object({
  url: z.string().optional(),
  mimetype: z.string().optional(),
  seconds: z.number().optional(),
  caption: z.string().optional(),
  fileName: z.string().optional(),
})

export const evolutionGoMessageContentSchema = z.object({
  conversation: z.string().optional(),
  extendedTextMessage: z
    .object({ text: z.string() })
    .optional(),
  audioMessage: evolutionGoMediaSchema.optional(),
  imageMessage: evolutionGoMediaSchema.optional(),
  documentMessage: evolutionGoMediaSchema.optional(),
  videoMessage: evolutionGoMediaSchema.optional(),
  stickerMessage: evolutionGoMediaSchema.optional(),
})

export const evolutionGoMessageEventSchema = z.object({
  Info: evolutionGoInfoSchema,
  Message: evolutionGoMessageContentSchema,
  IsEdit: z.boolean().optional(),
})

export type EvolutionGoMessageEvent = z.infer<typeof evolutionGoMessageEventSchema>

export const evolutionGoConnectionEventSchema = z.object({
  state: z.enum(['open', 'close', 'connecting']),
  statusReason: z.number().optional(),
})

export type EvolutionGoConnectionEvent = z.infer<typeof evolutionGoConnectionEventSchema>

export const evolutionGoStatusUpdateSchema = z.object({
  key: z.object({ id: z.string(), fromMe: z.boolean() }),
  update: z.object({ status: z.string().optional() }).optional(),
})

export const evolutionGoStatusEventSchema = z.array(evolutionGoStatusUpdateSchema)

export type EvolutionGoStatusEvent = z.infer<typeof evolutionGoStatusEventSchema>

// whatsmeow Receipt event — ReceiptTypeDelivery="" | ReceiptTypeRead="read" | ReceiptTypePlayed="played"
export const evolutionGoReceiptEventSchema = z.object({
  Chat: z.string(),
  Sender: z.string().optional(),
  IsFromMe: z.boolean(),
  IsGroup: z.boolean().optional(),
  MessageIDs: z.array(z.string()).nullable().optional(),
  Type: z.string().optional(),
  Timestamp: z.string().optional(),
})

export type EvolutionGoReceiptEvent = z.infer<typeof evolutionGoReceiptEventSchema>
