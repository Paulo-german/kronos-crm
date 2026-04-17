import type { ToolDataForResponder } from './two-phase-types'

// Formatador de moeda real brasileiro — reutilizado para cada produto.
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// Rótulos legíveis por tipo de mídia — mantém o texto neutro de referências
// a sistemas internos (nunca expõe nomes de campos ou enums ao Agent 2).
const MEDIA_LABEL: Record<'image' | 'video' | 'document', string> = {
  image: 'Foto',
  video: 'Vídeo',
  document: 'Doc',
}

// Formata um slot de disponibilidade como "HH:mm-HH:mm".
// A data é omitida porque o Agent 1 já agrupa por dia antes de popular
// availableSlots — repetir a data aqui só adicionaria ruído no prompt.
function formatSlot(slot: { startTime: string; endTime: string }): string {
  return `${slot.startTime}-${slot.endTime}`
}

// Converte uma data ISO 8601 para o formato PT-BR "DD/MM/AAAA, HH:mm".
// Usa UTC explícito para evitar deslocamentos de fuso horário no servidor.
function formatDateTimePtBr(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Serializa ToolDataForResponder em bloco de texto PT-BR para ser injetado
// como mensagem `system` no prompt do Agent 2. Função pura — sem I/O, sem
// efeitos colaterais, sem try/catch (validação Zod é responsabilidade do
// orchestrator antes de chamar este helper).
export function formatDataFromTools(data: ToolDataForResponder): string {
  const sections: string[] = []

  // --- Seção 1: Horários disponíveis ---
  if (data.availableSlots && data.availableSlots.length > 0) {
    const slots = data.availableSlots.map(formatSlot).join(', ')
    sections.push(`Horários disponíveis: ${slots}.`)
  }

  // --- Seção 2: Agendamento confirmado ---
  if (data.appointmentConfirmed) {
    const { operation, startDate, endDate } = data.appointmentConfirmed
    const start = formatDateTimePtBr(startDate)
    const end = formatDateTimePtBr(endDate)
    // Extrai apenas o horário de endDate (DD/MM/AAAA, HH:mm → HH:mm)
    const endTime = end.split(', ')[1] ?? end
    const operationLabel = operation === 'created' ? 'criado' : 'atualizado'
    sections.push(
      `Agendamento confirmado: ${start}-${endTime} (${operationLabel}).`,
    )
  }

  // --- Seção 3: Produtos encontrados ---
  if (data.products && data.products.length > 0) {
    const productLines: string[] = ['Produtos encontrados:']

    for (const product of data.products) {
      const price =
        product.price !== undefined ? brlFormatter.format(product.price) : null

      // Linha principal: "- Nome (R$ X,XX): descrição." ou variações parciais.
      const header = [
        `- ${product.name}`,
        price ? `(${price})` : null,
        product.shortDescription ? `: ${product.shortDescription}.` : null,
      ]
        .filter(Boolean)
        .join(' ')

      productLines.push(header)

      // Linhas de mídia com indentação de dois espaços — preserva URLs 1:1.
      if (product.media && product.media.length > 0) {
        for (const mediaItem of product.media) {
          const label = MEDIA_LABEL[mediaItem.type]
          productLines.push(`  ${label}: ${mediaItem.url}`)
        }
      }
    }

    sections.push(productLines.join('\n'))
  }

  // --- Seção 4: Erros ---
  // `errors[].tool` é filtrado aqui — é apenas telemetria interna e NUNCA
  // deve aparecer no prompt do Agent 2. Apenas `reason` e `suggestedFallback`
  // são expostos, de forma que o Agent 2 possa pivotar sem saber qual tool falhou.
  if (data.errors && data.errors.length > 0) {
    const errorLines: string[] = ['Erros:']

    for (const error of data.errors) {
      const line = error.suggestedFallback
        ? `- ${error.reason} — ${error.suggestedFallback}`
        : `- ${error.reason}`
      errorLines.push(line)
    }

    sections.push(errorLines.join('\n'))
  }

  // --- Seção 5: Escalação humana ---
  if (data.requiresHumanHandoff === true) {
    sections.push('[ATENÇÃO] Escalação humana necessária.')
  }

  // Retorna string vazia se não há nenhuma seção com dado — o Agent 2
  // trabalhará apenas com histórico + funil do PromptBaseContext.
  if (sections.length === 0) {
    return ''
  }

  return `[DADOS FACTUAIS DO SISTEMA]\n\n${sections.join('\n\n')}`
}
