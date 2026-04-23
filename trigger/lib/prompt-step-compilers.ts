import type { PromptBaseContext } from './prompt-base-context'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'

// Tipo de um step individual — extraído do array tipado do contexto base
type AgentStep = PromptBaseContext['steps'][number]

// ---------------------------------------------------------------------------
// Rótulos de campo para o tipo update_deal
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  title: 'título',
  value: 'valor em reais',
  priority: 'prioridade',
  expectedCloseDate: 'previsão de fechamento (ISO 8601)',
  notes: 'notas',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'baixa',
  medium: 'média',
  high: 'alta',
  urgent: 'urgente',
}

// ---------------------------------------------------------------------------
// E1 — Header + Objetivo
//
// Gera: "**{order}. {name}**\nObjetivo: {objective}"
// ---------------------------------------------------------------------------

export function compileStepCore(step: AgentStep): string {
  // (stepId: `UUID`) ancora o modelo no identificador da etapa do funil de
  // atendimento — usado EXCLUSIVAMENTE no campo `currentStep` do output
  // estruturado. Nunca deve ser passado como parâmetro de ferramentas (ex:
  // `targetStageId` do move_deal é UUID do pipeline kanban, outra entidade).
  // O rótulo `stepId` (em vez do genérico `id`) desambigua visualmente.
  return `**${step.order}. ${step.name}** (stepId: \`${step.id}\`)\nObjetivo: ${step.objective}`
}

// ---------------------------------------------------------------------------
// E2 — Pergunta-chave
//
// Retorna null quando o step não define keyQuestion — builders filtram o null
// antes de concatenar seções.
// ---------------------------------------------------------------------------

export function compileStepKeyQuestion(step: AgentStep): string | null {
  if (!step.keyQuestion) return null
  return `* Pergunta-chave: ${step.keyQuestion}`
}

// ---------------------------------------------------------------------------
// E3 — Bloco de ações imperativas
//
// Porta 1:1 a lógica de compileStepActions em trigger/build-system-prompt.ts,
// mas retorna um único string (linhas unidas por \n) ao invés de string[].
// Builders v2 incluem este bloco apenas no Tool Agent prompt.
// ---------------------------------------------------------------------------

export function compileStepActions(actions: AgentStep['actions']): string {
  const lines = actions
    .map((action) => compileActionLine(action))
    .filter((line) => line.length > 0)
  return lines.join('\n')
}

function compileActionLine(action: StepAction): string {
  const { trigger } = action

  switch (action.type) {
    case 'move_deal':
      // UUID em linha isolada para evitar alucinação do modelo — quando o ID
      // está embutido em prosa (ex: targetStageId="..."), Gemini tende a
      // pattern-generate um UUID novo ao invés de copiar o valor exato.
      return [
        `* ${trigger} → execute \`move_deal\`.`,
        `  → targetStageId: ${action.targetStage}`,
      ].join('\n')

    case 'update_contact':
      return `* ${trigger} → execute \`update_contact\` para registrar no contato.`

    case 'update_deal': {
      const resultLines: string[] = []

      let instruction = `* ${trigger} → execute \`update_deal\``
      if (action.allowedFields.length > 0) {
        const fieldList = action.allowedFields.map((field) => FIELD_LABELS[field]).join(', ')
        instruction += ` atualizando apenas: ${fieldList}`
      } else {
        instruction += ` — NÃO altere nenhum campo diretamente (apenas status, se permitido abaixo)`
      }
      resultLines.push(instruction + '.')

      if (action.fixedPriority && action.allowedFields.includes('priority')) {
        resultLines.push(
          `  → Prioridade OBRIGATÓRIA: "${PRIORITY_LABELS[action.fixedPriority]}" — não use outro valor.`,
        )
      }

      if (action.notesTemplate && action.allowedFields.includes('notes')) {
        resultLines.push(`  → Para as notas, registre: ${action.notesTemplate}`)
      }

      if (action.allowedStatuses.length > 0) {
        const statusLabels = action.allowedStatuses
          .map((status) => (status === 'WON' ? 'GANHO (WON)' : 'PERDIDO (LOST)'))
          .join(' ou ')
        resultLines.push(`  → Pode alterar o status para: ${statusLabels}.`)
      } else {
        resultLines.push(`  → NÃO altere o status do negócio nesta etapa.`)
      }

      return resultLines.join('\n')
    }

    case 'create_task':
      return `* ${trigger} → execute \`create_task\` com título "${action.title}"${
        action.dueDaysOffset ? ` (vencimento em ${action.dueDaysOffset} dias)` : ''
      }.`

    case 'list_availability':
      return `* ${trigger} → execute \`list_availability\` para consultar horários disponíveis. Quando o cliente pedir data/horário específico, passe \`date\` e/ou \`time\`.`

    case 'create_event': {
      const durationMinutes = action.duration
      const hours = Math.floor(durationMinutes / 60)
      const remainingMinutes = durationMinutes % 60
      const durationLabel =
        durationMinutes >= 60
          ? `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`
          : `${durationMinutes}min`

      const eventLines = [
        `* ${trigger} → execute \`create_event\` (duração: ${durationLabel}, janela: ${action.startTime}–${action.endTime}).`,
        `  → Para o título, siga: ${action.titleInstructions}`,
      ]

      if (action.allowReschedule) {
        const rescheduleNote = action.rescheduleInstructions
          ? `  → Reagendamento permitido. ${action.rescheduleInstructions}`
          : `  → Reagendamento permitido: use \`update_event\` quando o cliente solicitar mudança de horário.`
        eventLines.push(rescheduleNote)
      }

      return eventLines.join('\n')
    }

    case 'search_knowledge':
      // Tool implícita: injetada automaticamente quando há KB — instrução por step é redundante.
      return ''

    case 'hand_off_to_human': {
      const base = `* ${trigger} → execute \`hand_off_to_human\` para transferir.`

      if (action.notifyTarget === 'specific_number') {
        return `${base}\n  → O atendente será notificado automaticamente via WhatsApp.`
      }
      if (action.notifyTarget === 'deal_assignee') {
        return `${base}\n  → O responsável pelo negócio será notificado automaticamente via WhatsApp.`
      }
      return base
    }

    default: {
      // Garante exaustividade — TypeScript captura se um novo type for adicionado ao schema
      const _exhaustive: never = action
      throw new Error(`Tipo de ação desconhecido: ${(_exhaustive as StepAction).type}`)
    }
  }
}

// ---------------------------------------------------------------------------
// E4 — Template de mensagem
//
// Retorna null quando o step não define messageTemplate — builders filtram o
// null antes de concatenar seções.
// ---------------------------------------------------------------------------

export function compileStepTemplate(step: AgentStep): string | null {
  if (!step.messageTemplate) return null
  return `**Template de mensagem:** ${step.messageTemplate}`
}
