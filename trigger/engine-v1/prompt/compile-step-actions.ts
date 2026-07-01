import type { StepAction } from '@/_actions/agent/shared/step-action-schema'

const PRIORITY_LABELS: Record<string, string> = {
  low: 'baixa',
  medium: 'média',
  high: 'alta',
  urgent: 'urgente',
}

const FIELD_LABELS: Record<string, string> = {
  title: 'título',
  value: 'valor',
  priority: 'prioridade',
  expectedCloseDate: 'previsão de fechamento',
  notes: 'observações',
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h${rest}min` : `${hours}h`
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

// Conjunções condicionais que o dono costuma escrever no início do gatilho. Quando já
// existem, não duplicamos "Quando" (evita "Quando quando o cliente…"); senão, prefixamos.
const CONDITION_START = /^(quando|se|assim que|sempre que|depois|após|caso)\b/i

function conditionPrefix(rawTrigger: string): string {
  const trigger = rawTrigger.trim().replace(/[.;]+$/, '')
  if (!trigger) return ''
  const clause = CONDITION_START.test(trigger)
    ? trigger
    : `Quando ${lowerFirst(trigger)}`
  return `${clause}, `
}

// Compila as ações da etapa em instruções de NEGÓCIO, em linguagem natural — sem vazar
// nome técnico de ferramenta nem UUID (o código resolve os IDs; o modelo só expressa a
// intenção, e conecta com a ferramenta certa pelo schema dela). Cada item parte do gatilho.
export function compileStepActions(actions: StepAction[]): string[] {
  return actions.map((action) => describeAction(action))
}

function describeAction(action: StepAction): string {
  const prefix = conditionPrefix(action.trigger)

  switch (action.type) {
    case 'move_deal':
      return `${prefix}avance a negociação para a etapa configurada.`
    case 'update_contact':
      return `${prefix}registre os dados informados pelo contato.`
    case 'update_deal': {
      if (action.allowedFields.length === 0) {
        return `${prefix}mantenha a negociação como está (sem alterar campos diretamente).`
      }
      const fields = action.allowedFields
        .map((field) => FIELD_LABELS[field] ?? field)
        .join(', ')
      let text = `${prefix}atualize na negociação: ${fields}.`
      if (action.fixedPriority && action.allowedFields.includes('priority')) {
        text += ` A prioridade deve ser ${PRIORITY_LABELS[action.fixedPriority]}.`
      }
      if (action.notesTemplate && action.allowedFields.includes('notes')) {
        text += ` Nas observações, registre: ${action.notesTemplate}`
      }
      return text
    }
    case 'create_task':
      return `${prefix}crie uma tarefa de acompanhamento: "${action.title}"${
        action.dueDaysOffset ? ` (em ${action.dueDaysOffset} dia(s))` : ''
      }.`
    case 'list_availability':
      return `${prefix}consulte os horários disponíveis antes de sugerir qualquer data ao cliente.`
    case 'create_event': {
      const duration = formatDuration(action.duration)
      return `${prefix}agende o compromisso (duração de ${duration}, entre ${action.startTime} e ${action.endTime}). Confirme o horário com o cliente antes de fechar.`
    }
    case 'hand_off_to_human':
      return `${prefix}envolva um atendente humano no atendimento.`
    case 'create_appointment': {
      const window =
        action.startTime && action.endTime
          ? ` (entre ${action.startTime} e ${action.endTime})`
          : ''
      return `${prefix}agende o serviço com um profissional disponível${window}.`
    }
    default: {
      // Exaustividade: se um novo tipo de action surgir, o TS acusa aqui.
      const _exhaustive: never = action
      void _exhaustive
      return `${prefix}execute a ação configurada.`
    }
  }
}
