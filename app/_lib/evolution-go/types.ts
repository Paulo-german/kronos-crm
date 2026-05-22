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

export const evolutionGoMessageKeySchema = z.object({
  remoteJid: z.string(),
  remoteJidAlt: z.string().optional(),
  fromMe: z.boolean(),
  id: z.string(),
})

export const evolutionGoMediaSchema = z.object({
  url: z.string(),
  mimetype: z.string(),
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
})

export const evolutionGoMessageEventSchema = z.object({
  key: evolutionGoMessageKeySchema,
  pushName: z.string().optional(),
  message: evolutionGoMessageContentSchema,
  messageType: z.string().optional(),
  messageTimestamp: z.number(),
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
