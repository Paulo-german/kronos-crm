import type { ConversationState, OpenDeal } from './context'

// Formata um Decimal-string em BRL; devolve null quando não há valor relevante.
function formatBRL(value: string): string | null {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function describeDeal(deal: OpenDeal): string {
  const parts: string[] = [`"${deal.title}"`]

  if (deal.products.length > 0) {
    const items = deal.products
      .map((item) =>
        item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name,
      )
      .join(', ')
    parts.push(`(${items})`)
  }

  const value = formatBRL(deal.value)
  if (value) parts.push(value)

  parts.push(`na etapa ${deal.stageName}`)
  return parts.join(' ')
}

function describeMeeting(
  meeting: NonNullable<ConversationState['nextMeeting']>,
  timezone: string,
): string {
  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(meeting.whenIso))
  const label = meeting.serviceName ?? meeting.title
  return `${label} em ${when}`
}

// Briefing da situação comercial em PROSA — fatos já digeridos pelo código (negociações
// abertas, o que se negocia, se há agendamento), omitindo o que é vazio. Não é dump
// key-value: é o que o atendente precisa saber pra conduzir, em linguagem natural.
export function composeSituation(
  conversation: ConversationState,
  timezone: string,
): string {
  const lines: string[] = []

  lines.push(
    conversation.contactName
      ? `Você está atendendo ${conversation.contactName}.`
      : 'Você ainda não sabe o nome de quem está atendendo — descubra naturalmente ao longo da conversa.',
  )

  if (conversation.openDeals.length === 0) {
    lines.push('Ainda não há negociação aberta com este contato.')
  } else if (conversation.openDeals.length === 1) {
    lines.push(
      `Negociação em aberto: ${describeDeal(conversation.openDeals[0])}.`,
    )
  } else {
    lines.push(`Há ${conversation.openDeals.length} negociações em aberto:`)
    for (const deal of conversation.openDeals) {
      lines.push(`- ${describeDeal(deal)}`)
    }
  }

  lines.push(
    conversation.nextMeeting
      ? `Já existe compromisso agendado: ${describeMeeting(conversation.nextMeeting, timezone)}.`
      : 'Ainda não há compromisso agendado com este contato.',
  )

  return lines.join('\n')
}
