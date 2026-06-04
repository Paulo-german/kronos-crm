import type { ModelMessage } from 'ai'
import { ACTION_TOOL_LABELS, QUERY_TOOL_NAMES, KNOWN_TOOL_NAMES } from './constants'

// ---------------------------------------------------------------------------
// buildLlmMessages — monta o array de mensagens que vai para o LLM
// ---------------------------------------------------------------------------

interface MessageHistoryItem {
  role: string
  content: string
  metadata: unknown
}

export function buildLlmMessages(
  systemPrompt: string,
  summary: string | null,
  messageHistory: MessageHistoryItem[],
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const llmMessages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }> = []

  llmMessages.push({ role: 'system', content: systemPrompt })

  if (summary) {
    llmMessages.push({
      role: 'system',
      content: `Resumo da conversa anterior:\n${summary}`,
    })
  }

  for (const msg of messageHistory) {
    if (msg.role !== 'user' && msg.role !== 'assistant') continue

    let messageContent = msg.content

    if (msg.role === 'assistant' && msg.metadata) {
      const meta = msg.metadata as Record<string, unknown>
      if (
        typeof meta.mediaTranscription === 'string' &&
        meta.mediaTranscription.length > 0
      ) {
        const mediaInfo = meta.media as Record<string, unknown> | undefined
        const mimetype = mediaInfo?.mimetype as string | undefined
        const fileName = mediaInfo?.fileName as string | undefined
        const hasCaption =
          msg.content !== '[Imagem]' &&
          msg.content !== '[Vídeo]' &&
          !msg.content.startsWith('[Documento:')

        const captionPart = hasCaption ? ` com mensagem: "${msg.content}"` : ''

        if (mimetype?.startsWith('image/')) {
          messageContent = `[Imagem enviada pelo atendente${captionPart} — conteúdo da imagem: ${meta.mediaTranscription}]`
        } else if (fileName) {
          messageContent = `[Documento "${fileName}" enviado pelo atendente${captionPart} — conteúdo extraído:\n${meta.mediaTranscription}]`
        } else {
          messageContent = `[Mídia enviada pelo atendente${captionPart} — conteúdo: ${meta.mediaTranscription}]`
        }
      }
    }

    llmMessages.push({
      role: msg.role as 'user' | 'assistant',
      content: messageContent,
    })
  }

  return llmMessages
}

// ---------------------------------------------------------------------------
// formatQueryToolResult — formata saída de query tools como texto legível
// ---------------------------------------------------------------------------

export function formatQueryToolResult(
  toolName: string,
  outputValue: unknown,
): string | null {
  if (toolName === 'search_products') {
    const val = outputValue as Record<string, unknown> | null
    if (!val || typeof val !== 'object') return null
    const products = val.products
    if (!Array.isArray(products) || products.length === 0) {
      return 'Nenhum produto encontrado para esta busca.'
    }
    const lines = products.map((product: unknown) => {
      const item = product as Record<string, unknown>
      const name = typeof item.name === 'string' ? item.name : '?'
      const price =
        typeof item.price === 'number'
          ? `R$ ${item.price.toFixed(2).replace('.', ',')}`
          : null
      const description =
        typeof item.description === 'string' && item.description
          ? item.description
          : null
      const parts = [name, price].filter(Boolean).join(': ')
      return description ? `- ${parts} — ${description}` : `- ${parts}`
    })
    return `Produtos encontrados:\n${lines.join('\n')}`
  }

  if (toolName === 'search_knowledge') {
    const val = outputValue as Record<string, unknown> | null
    if (!val || typeof val !== 'object') return null
    const results = val.results
    if (!Array.isArray(results) || results.length === 0) {
      return 'Nenhum resultado encontrado na base de conhecimento.'
    }
    const contents = results
      .map((result: unknown) => {
        const entry = result as Record<string, unknown>
        return typeof entry.content === 'string' ? entry.content.trim() : ''
      })
      .filter(Boolean)
    return `Informações da base de conhecimento:\n${contents.join('\n\n')}`
  }

  if (toolName === 'list_availability') {
    const val = outputValue as Record<string, unknown> | null
    if (!val || typeof val !== 'object') return null
    const message = typeof val.message === 'string' ? val.message : ''
    const slots = val.slots
    if (!Array.isArray(slots) || slots.length === 0) {
      return message || 'Nenhum horário disponível.'
    }
    const lines = slots.map((slot: unknown) => {
      const entry = slot as Record<string, unknown>
      const dayOfWeek = typeof entry.dayOfWeek === 'string' ? entry.dayOfWeek : ''
      const date = typeof entry.date === 'string' ? entry.date : ''
      const startTime = typeof entry.startTime === 'string' ? entry.startTime : ''
      const endTime = typeof entry.endTime === 'string' ? entry.endTime : ''
      return `- ${dayOfWeek}, ${date} às ${startTime}–${endTime}`
    })
    return message ? `${message}\n${lines.join('\n')}` : lines.join('\n')
  }

  return null
}

// ---------------------------------------------------------------------------
// sanitizeToolMessages — filtra mensagens do Call 1 para o Responder (Call 2)
//
// Mantém apenas pares tool-call/tool-result com resultado útil; descarta o resto:
// - Texto final do assistant (Call 1) → descartado (Call 2 gera sem viés do Call 1).
// - Par query tool com resultado → mantido (Call 2 usa os dados para responder).
// - Par action tool com resultado → mantido (Call 2 sabe o que foi executado).
// - Par com resultado vazio → descartado (ambos do par).
// ---------------------------------------------------------------------------

export function sanitizeToolMessages(messages: ModelMessage[]): ModelMessage[] {
  const toolCallIdsWithContent = new Set<string>()
  for (const message of messages) {
    if (message.role !== 'tool' || !Array.isArray(message.content)) continue
    for (const part of message.content) {
      if (part.type !== 'tool-result') continue
      const outputValue = part.output.type === 'json' ? part.output.value : null
      const hasContent = QUERY_TOOL_NAMES.has(part.toolName)
        ? !!formatQueryToolResult(part.toolName, outputValue)
        : !!(
            outputValue &&
            typeof outputValue === 'object' &&
            !Array.isArray(outputValue) &&
            Object.keys(outputValue as object).length > 0
          )
      if (hasContent) toolCallIdsWithContent.add(part.toolCallId)
    }
  }

  return messages.flatMap((message) => {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      const textParts: string[] = []
      const toolCallPartsWithContent = message.content.filter(
        (part) =>
          part.type === 'tool-call' &&
          toolCallIdsWithContent.has(part.toolCallId),
      )

      for (const part of message.content) {
        if (part.type === 'text') {
          if (part.text.trim()) textParts.push(part.text.trim())
        } else if (
          part.type === 'tool-call' &&
          !toolCallIdsWithContent.has(part.toolCallId)
        ) {
          const label = ACTION_TOOL_LABELS[part.toolName]
          if (!QUERY_TOOL_NAMES.has(part.toolName)) {
            textParts.push(
              label
                ? `[Ação executada: ${label}]`
                : `[Ação executada: ${part.toolName}]`,
            )
          }
        }
      }

      if (toolCallPartsWithContent.length > 0) {
        const filteredContent = message.content.filter(
          (part) =>
            (part.type === 'text' && part.text.trim()) ||
            (part.type === 'tool-call' &&
              toolCallIdsWithContent.has(part.toolCallId)),
        )
        return [{ ...message, content: filteredContent } as ModelMessage]
      }

      if (textParts.length === 0) return []
      return [
        { role: 'assistant', content: textParts.join('\n') } as ModelMessage,
      ]
    }

    if (message.role === 'tool' && Array.isArray(message.content)) {
      const hasContent = message.content.some(
        (part) =>
          part.type === 'tool-result' &&
          toolCallIdsWithContent.has(part.toolCallId),
      )
      return hasContent ? [message] : []
    }

    // Texto final do Call 1: assistant com content string (sem tool-calls) → descartar.
    if (message.role === 'assistant') return []

    return [message]
  })
}

// ---------------------------------------------------------------------------
// buildResponderGroundingDirective — diretiva de grounding para o Responder
//
// Analisa quais query tools foram chamadas e gera constraints positivas
// ("use APENAS o que os tools retornaram") em vez de apenas negativas
// ("NUNCA invente"). A diferença elimina alucinações no Call 2.
// ---------------------------------------------------------------------------

export function buildResponderGroundingDirective(
  steps: Array<{ toolCalls?: Array<{ toolName: string }> }> | undefined,
): string {
  const queryToolsUsed = new Set<string>()
  const actionToolsUsed: string[] = []

  for (const step of steps ?? []) {
    for (const toolCall of step.toolCalls ?? []) {
      if (QUERY_TOOL_NAMES.has(toolCall.toolName)) {
        queryToolsUsed.add(toolCall.toolName)
      } else {
        actionToolsUsed.push(toolCall.toolName)
      }
    }
  }

  const constraints: string[] = []

  if (queryToolsUsed.has('search_products')) {
    constraints.push(
      '- Produtos e preços: referencie APENAS os itens retornados pela busca de produtos acima. ' +
        'Não acrescente outros nomes, valores ou características que não estejam nesses resultados.',
    )
  }

  if (queryToolsUsed.has('search_knowledge')) {
    constraints.push(
      '- Informações da empresa: use APENAS o conteúdo retornado pela base de conhecimento acima. ' +
        'Não complete com suposições ou dados do seu treinamento.',
    )
  }

  if (queryToolsUsed.has('list_availability')) {
    constraints.push(
      '- Disponibilidade: mencione APENAS os horários listados acima. ' +
        'Não sugira slots, datas ou horários que não foram retornados.',
    )
  }

  if (queryToolsUsed.size === 0) {
    constraints.push(
      '- Nenhuma busca foi feita neste turno. Não faça afirmações sobre produtos, preços, ' +
        'disponibilidade, prazos ou políticas da empresa. Se precisar dessas informações para ' +
        'responder ao cliente, diga que vai verificar.',
    )
  }

  // Quando action tools foram chamadas, orientar o Responder a confirmar o resultado
  // ao cliente com base no retorno de cada ferramenta (success/message).
  if (actionToolsUsed.length > 0) {
    const uniqueActions = [...new Set(actionToolsUsed)]
    const labels = uniqueActions
      .map((name) => ACTION_TOOL_LABELS[name] ?? name)
      .join(', ')
    constraints.push(
      `- Ações realizadas neste turno: ${labels}. ` +
        'Consulte o resultado de cada ferramenta acima: se success=true, confirme naturalmente ' +
        'ao cliente o que foi feito (ex: "Já avancei o negócio para a próxima etapa"); ' +
        'se success=false, explique o motivo com base na mensagem retornada pela ferramenta.',
    )
  }

  const base =
    '## Grounding desta resposta\n\n' +
    'Escreva usando APENAS as informações presentes neste contexto. ' +
    'Não adicione detalhes que não foram retornados pelas ferramentas ou fornecidos explicitamente nas instruções.\n\n'

  return base + constraints.join('\n')
}

// ---------------------------------------------------------------------------
// stripLeakedToolCalls — remove JSON de tool calls vazado como texto pelo LLM
// ---------------------------------------------------------------------------

export function stripLeakedToolCalls(text: string): string {
  let cleaned = text.replace(
    /\{[^{}]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^{}]*\}/g,
    (match, toolName: string) => {
      if (KNOWN_TOOL_NAMES.has(toolName)) return ''
      return match
    },
  )

  cleaned = cleaned.replace(
    /```(?:json)?\s*\n?\{[^`]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^`]*\}[\s\n]*```/g,
    (match, toolName: string) => {
      if (KNOWN_TOOL_NAMES.has(toolName)) return ''
      return match
    },
  )

  // Formato {"recipientname":"functions.handofftohuman","parameters":{...}}
  cleaned = cleaned.replace(
    /\{[^{}]*"recipientname"\s*:\s*"functions\.[^"]*"[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g,
    '',
  )

  // `currentStep` <uuid> — campo do generateObject vazado dentro do campo message
  cleaned = cleaned.replace(
    /\n?`currentStep`\s+[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\n?/g,
    '',
  )

  return cleaned
}
