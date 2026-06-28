import { z } from 'zod'

// Stages semeáveis: do reset (LEAD) o lifecycle só avança, então COLD (abaixo de LEAD)
// não faz sentido como ponto de partida.
export const SIMULATOR_SEEDABLE_STAGES = [
  'LEAD',
  'QUALIFIED',
  'OPPORTUNITY',
  'CUSTOMER',
] as const

export const createSimulatorConversationSchema = z.object({
  agentId: z.string().uuid('ID de agente inválido'),
  // Ponto de partida do funil para a simulação (default LEAD = lead novo).
  initialLifecycleStage: z.enum(SIMULATOR_SEEDABLE_STAGES).optional(),
  // Persona do contato simulado (MVP: campos nativos). Sobrescreve o contato singleton.
  persona: z
    .object({
      name: z.string().trim().max(120).optional(),
      email: z
        .string()
        .trim()
        .email('E-mail inválido')
        .max(160)
        .optional()
        .or(z.literal('')),
      role: z.string().trim().max(120).optional(),
    })
    .optional(),
})

export type CreateSimulatorConversationInput = z.infer<
  typeof createSimulatorConversationSchema
>
