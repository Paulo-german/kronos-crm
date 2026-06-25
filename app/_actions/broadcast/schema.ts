import { z } from 'zod'
import { businessHoursConfigSchema } from '@/_actions/agent/update-agent/schema'

// O critério de canal elegível para disparo (selfhosted real) vive em
// `@/_lib/whatsapp/broadcast-eligibility` — usado na query e na validação.

// Ritmo de envio entre números. Default alto (30s) para preservar a reputação do
// número; teto de 5 min para listas frias muito sensíveis.
export const DEFAULT_THROTTLE_MS = 30_000
const MIN_THROTTLE_MS = 5_000
const MAX_THROTTLE_MS = 300_000
const MAX_RECIPIENTS = 5000

export const MAX_BROADCAST_RECIPIENTS = MAX_RECIPIENTS

export const createBroadcastSchema = z
  .object({
    inboxId: z.string().uuid(),
    name: z.string().min(2).max(120),
    // Texto livre (EVOLUTION/Z_API). Opcional no Zod: a obrigatoriedade depende do
    // provedor da inbox (regra aplicada na action, que conhece o connectionType).
    messageContent: z.string().max(4096).optional(),
    // Template HSM (META_CLOUD). Validação condicional na action.
    templateName: z.string().max(512).optional(),
    templateLanguage: z.string().max(16).optional(),
    // Params fixos das variáveis do template, iguais para todos os contatos (v1)
    templateParams: z.array(z.string().max(1024)).max(20).optional(),
    // Modo manual: lista de contactIds escolhidos pelo usuário
    contactIds: z.array(z.string().uuid()).max(MAX_RECIPIENTS).optional(),
    // Modo segmento: id de uma ContactSegment salva (resolvida no servidor)
    segmentId: z.string().uuid().optional(),
    throttleMs: z
      .number()
      .int()
      .min(MIN_THROTTLE_MS)
      .max(MAX_THROTTLE_MS)
      .default(DEFAULT_THROTTLE_MS),
    // coerce: o client envia Date que serializa como string no payload da action
    scheduledFor: z.coerce
      .date()
      .refine((date) => date.getTime() > Date.now(), {
        message: 'O agendamento deve ser no futuro.',
      })
      .optional(),
    // Janela de envio: restringe o disparo a horários/dias.
    sendingWindowEnabled: z.boolean().default(false),
    sendingWindowConfig: businessHoursConfigSchema.optional(),
    sendingWindowTimezone: z.string().default('America/Sao_Paulo'),
  })
  // Exatamente um modo de seleção: contatos OU segmento
  .refine(
    (data) => Boolean(data.segmentId) !== Boolean(data.contactIds?.length),
    {
      message: 'Escolha contatos manualmente ou um segmento (apenas um).',
      path: ['contactIds'],
    },
  )
  // Janela habilitada exige config com ao menos um dia ativo
  .refine(
    (data) =>
      !data.sendingWindowEnabled ||
      (data.sendingWindowConfig != null &&
        Object.values(data.sendingWindowConfig).some((day) => day.enabled)),
    {
      message: 'Habilite ao menos um dia na janela de envio.',
      path: ['sendingWindowConfig'],
    },
  )

export const cancelBroadcastSchema = z.object({
  broadcastId: z.string().uuid(),
})

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>
export type CancelBroadcastInput = z.infer<typeof cancelBroadcastSchema>
