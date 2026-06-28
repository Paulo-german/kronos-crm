import 'server-only'

import { db } from '@/_lib/prisma'

const TRANSCRIPT_FETCH_LIMIT = 1000

interface SimulatorTranscript {
  markdown: string
  filename: string
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function roleLabel(role: string): string {
  if (role === 'user') return 'Cliente'
  if (role === 'assistant') return 'Agente'
  return role
}

/**
 * Monta um transcript em markdown de uma conversa simulada para comparar versões
 * de prompt. Inclui a troca de mensagens (conteúdo completo) e uma síntese de
 * métricas por turno (modelo, duração, tokens, créditos). NÃO inclui input/output
 * de steps nem metadata bruta — evita escapar payloads sensíveis.
 *
 * O caller (route handler) é responsável por validar super admin + SIMULATOR.
 */
export async function getSimulatorTranscript(
  conversationId: string,
): Promise<SimulatorTranscript> {
  const [conversation, messages, executions] = await Promise.all([
    db.conversation.findUnique({
      where: { id: conversationId },
      select: {
        createdAt: true,
        contact: { select: { name: true, lifecycleStage: true } },
        inbox: { select: { agent: { select: { name: true } } } },
      },
    }),
    db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: TRANSCRIPT_FETCH_LIMIT,
      select: { role: true, content: true, createdAt: true },
    }),
    db.agentExecution.findMany({
      where: { conversationId },
      orderBy: { startedAt: 'asc' },
      take: TRANSCRIPT_FETCH_LIMIT,
      select: {
        startedAt: true,
        durationMs: true,
        inputTokens: true,
        outputTokens: true,
        creditsCost: true,
        status: true,
        finishReason: true,
      },
    }),
  ])

  const agentName = conversation?.inbox.agent?.name ?? 'Agente'
  const contactName = conversation?.contact?.name ?? 'Contato'

  const lines: string[] = [
    `# Simulação — ${agentName}`,
    '',
    `- Contato: ${contactName}`,
    `- Lifecycle: ${conversation?.contact?.lifecycleStage ?? '—'}`,
    conversation
      ? `- Iniciada em: ${formatDateTime(conversation.createdAt)}`
      : '',
    '',
    '## Conversa',
    '',
  ]

  for (const message of messages) {
    lines.push(
      `**${roleLabel(message.role)}** · ${formatDateTime(message.createdAt)}`,
    )
    lines.push('')
    lines.push(message.content)
    lines.push('')
  }

  if (executions.length > 0) {
    lines.push('## Métricas por turno', '')
    executions.forEach((execution, index) => {
      const tokens =
        execution.inputTokens != null || execution.outputTokens != null
          ? `${execution.inputTokens ?? 0}→${execution.outputTokens ?? 0} tokens`
          : 'tokens n/d'
      const duration =
        execution.durationMs != null
          ? `${(execution.durationMs / 1000).toFixed(1)}s`
          : 'n/d'
      const credits =
        execution.creditsCost != null
          ? `${execution.creditsCost} créditos`
          : 'créditos n/d'
      lines.push(
        `${index + 1}. ${execution.status} · ${duration} · ${tokens} · ${credits}` +
          (execution.finishReason ? ` · ${execution.finishReason}` : ''),
      )
    })
    lines.push('')
  }

  const stamp = conversation
    ? conversation.createdAt.toISOString().slice(0, 10)
    : 'export'

  return {
    markdown: lines.filter((line) => line !== undefined).join('\n'),
    filename: `simulacao-${conversationId.slice(0, 8)}-${stamp}.md`,
  }
}
