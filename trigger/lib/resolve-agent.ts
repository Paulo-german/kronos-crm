import { db } from '@/_lib/prisma'

// ---------------------------------------------------------------------------
// Tipos de retorno
// ---------------------------------------------------------------------------

export interface ResolvedAgent {
  agentId: string
  isActive: boolean
  debounceSeconds: number
  businessHoursEnabled: boolean
  businessHoursTimezone: string
  businessHoursConfig: unknown
  outOfHoursMessage: string | null
  // Sinaliza se o processAgentMessage precisa rodar o router antes de processar
  requiresRouting: boolean
  groupId: string | null
}

// Tipo do inbox expandido — inclui agentGroup para suporte a grupos
export interface InboxWithGroupContext {
  agentId: string | null
  agentGroupId: string | null
  agent: {
    id: string
    isActive: boolean
    debounceSeconds: number
    businessHoursEnabled: boolean
    businessHoursTimezone: string
    businessHoursConfig: unknown
    outOfHoursMessage: string | null
  } | null
  agentGroup: {
    id: string
    isActive: boolean
    members: Array<{
      agent: {
        id: string
        isActive: boolean
        debounceSeconds: number
        businessHoursEnabled: boolean
        businessHoursTimezone: string
        businessHoursConfig: unknown
        outOfHoursMessage: string | null
      }
    }>
  } | null
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Resolve qual agente deve processar a conversa.
 *
 * Casos:
 * 1. Inbox com agentId (standalone) → retorna o agente direto, sem mudança de comportamento
 * 2. Inbox com agentGroupId:
 *    2a. Grupo inativo → null (sem IA)
 *    2b. Conversa já tem activeAgentId com worker ativo → vai direto pro worker
 *    2c. Sem worker ativo → requiresRouting = true (router classifica 24h, sem business hours)
 * 3. Sem agente configurado → null
 */
export async function resolveAgentForConversation(
  inbox: InboxWithGroupContext,
  conversation: { id: string; activeAgentId: string | null } | null,
): Promise<ResolvedAgent | null> {
  // Caso 1: Inbox com agente standalone (fluxo atual — zero mudança de comportamento)
  if (inbox.agentId && inbox.agent) {
    return {
      agentId: inbox.agent.id,
      isActive: inbox.agent.isActive,
      debounceSeconds: inbox.agent.debounceSeconds,
      businessHoursEnabled: inbox.agent.businessHoursEnabled,
      businessHoursTimezone: inbox.agent.businessHoursTimezone,
      businessHoursConfig: inbox.agent.businessHoursConfig,
      outOfHoursMessage: inbox.agent.outOfHoursMessage,
      requiresRouting: false,
      groupId: null,
    }
  }

  // Caso 2: Inbox com grupo de agentes
  if (inbox.agentGroupId && inbox.agentGroup) {
    // 2a: Grupo inativo → sem IA, atendimento manual
    if (!inbox.agentGroup.isActive) return null

    // 2b: Conversa já tem worker ativo — buscar config do worker para business hours check
    if (conversation?.activeAgentId) {
      const activeWorker = await db.agent.findUnique({
        where: { id: conversation.activeAgentId },
        select: {
          id: true,
          isActive: true,
          debounceSeconds: true,
          businessHoursEnabled: true,
          businessHoursTimezone: true,
          businessHoursConfig: true,
          outOfHoursMessage: true,
        },
      })

      // Worker encontrado e ativo → usar diretamente
      if (activeWorker?.isActive) {
        return {
          agentId: activeWorker.id,
          isActive: activeWorker.isActive,
          debounceSeconds: activeWorker.debounceSeconds,
          businessHoursEnabled: activeWorker.businessHoursEnabled,
          businessHoursTimezone: activeWorker.businessHoursTimezone,
          businessHoursConfig: activeWorker.businessHoursConfig,
          outOfHoursMessage: activeWorker.outOfHoursMessage,
          requiresRouting: false,
          groupId: inbox.agentGroupId,
        }
      }
      // Worker inativo ou removido → forçar novo roteamento
    }

    // 2c: Sem worker ativo → precisa de roteamento
    // Router é embutido no grupo e opera 24h (sem business hours).
    // Business hours check ocorre DEPOIS do roteamento, com a config do worker resolvido.
    return {
      agentId: '', // será preenchido pelo router
      isActive: true,
      debounceSeconds: 0, // router processa imediatamente (sem debounce extra)
      businessHoursEnabled: false, // router opera 24h
      businessHoursTimezone: 'America/Sao_Paulo',
      businessHoursConfig: null,
      outOfHoursMessage: null,
      requiresRouting: true,
      groupId: inbox.agentGroupId,
    }
  }

  // Sem agente nem grupo configurado → sem IA
  return null
}
