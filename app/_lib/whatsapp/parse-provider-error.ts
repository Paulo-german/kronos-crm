// Mantendo `type` (não `interface`) pois o index signature [key: string] é necessário
// para compatibilidade com o campo `metadata` do Prisma (JsonObject).
export type ProviderDeliveryError = {
  code?: number
  title?: string
  message?: string
  userMessage?: string
  [key: string]: string | number | undefined
}

const FALLBACK_USER_MESSAGE = 'Falha na entrega da mensagem. Tente novamente.'

/**
 * Mapa de erros da Meta Graph API movido para cá para ser a única fonte de verdade
 * na tradução de erros. O message-bubble mantém uma cópia legada para retrocompatibilidade
 * com mensagens antigas que não possuem o campo `userMessage` no metadata.
 */
const META_ERROR_MESSAGES: Record<number, string> = {
  130429: 'Limite de envio atingido. Tente novamente em breve.',
  131009: 'Parâmetro inválido na mensagem.',
  131021: 'O destinatário não pode ser o próprio remetente.',
  131026: 'Número não está no WhatsApp.',
  131031: 'Conta do destinatário bloqueada.',
  131042: 'Pagamento não configurado na conta Meta. Configure um método de pagamento.',
  131045: 'Conta Meta sem elegibilidade para envio.',
  131047: 'Janela de 24h expirada. Envie um template.',
  131048: 'Limite de spam atingido. Aguarde antes de reenviar.',
  131051: 'Tipo de mensagem não suportado.',
  131056: 'Muitas mensagens para o mesmo número. Aguarde.',
  131057: 'Conta em manutenção. Tente novamente mais tarde.',
  132000: 'Quantidade de variáveis não corresponde ao template.',
  132001: 'Template não encontrado.',
  132005: 'Texto do template excede o limite.',
  132012: 'Formato de variável inválido.',
  132015: 'Template pausado pelo Meta.',
  132016: 'Template desativado pelo Meta.',
}

/**
 * Checa se a mensagem de erro já está em PT-BR legível — originada dos connection guards
 * que lançam erros traduzidos antes mesmo de tentar a chamada ao provider.
 * Trata variações com e sem acento (ex: retornos de providers que podem perder encoding).
 */
function isDirectPortugueseMessage(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    lower.includes('desconectado') ||
    lower.includes('não possui whatsapp') ||
    lower.includes('nao possui whatsapp') ||
    lower.includes('não configurad') ||
    lower.includes('nao configurad') ||
    lower.includes('requer url pública') ||
    lower.includes('requer url publica')
  )
}

/**
 * Extrai o corpo do erro após o padrão "(NNN): ".
 * Ex: "Evolution API sendText failed (400): Not found" → "Not found"
 */
function extractBodyText(msg: string): string {
  const match = msg.match(/\(\d{3}\):\s*([\s\S]+)$/)
  return match ? match[1].trim() : msg
}

/**
 * Aplica as tabelas de pattern matching por provider e retorna a mensagem traduzida.
 * Retorna o fallback genérico se nenhum padrão bater.
 */
function matchProviderError(
  statusCode: number | undefined,
  bodyText: string,
  isEvolution: boolean,
  isZApi: boolean,
): string {
  const bodyLower = bodyText.toLowerCase()

  // Padrões compartilhados independente de provider
  if (statusCode === 401 || statusCode === 403) {
    if (isEvolution) return 'Credenciais do WhatsApp inválidas. Reconecte nas configurações.'
    if (isZApi) return 'Credenciais da Z-API inválidas. Reconecte nas configurações.'
  }

  if (isEvolution) {
    // AxiosError com timeout tem prioridade sobre status code
    if (bodyLower.includes('axioserror') && (bodyLower.includes('timeout') || bodyLower.includes('etimedout'))) {
      return 'Tempo de conexão esgotado. Tente novamente.'
    }

    // AxiosError 404 indica mídia não encontrada (link expirado)
    if (bodyLower.includes('axioserror') && bodyLower.includes('404')) {
      return 'Mídia não encontrada. O arquivo pode ter expirado.'
    }

    if (statusCode === 400) {
      if (bodyLower.includes('exists":false') || /exists.*false/.test(bodyLower)) {
        return 'Número não está no WhatsApp. Verifique o telefone do contato.'
      }
      if (bodyLower.includes('media') || bodyLower.includes('file')) {
        return 'Arquivo não suportado ou corrompido. Tente outro formato.'
      }
      return 'Dados inválidos enviados ao WhatsApp. Verifique e tente novamente.'
    }

    if (statusCode === 404 || (statusCode !== undefined && bodyLower.includes('not found'))) {
      return 'Serviço WhatsApp não encontrado. Verifique a conexão.'
    }

    if (statusCode !== undefined && statusCode >= 500) {
      return 'Erro no servidor WhatsApp. Tente novamente em alguns minutos.'
    }
  }

  if (isZApi) {
    if (statusCode === 429) {
      return 'Limite de envio atingido. Aguarde alguns segundos e tente novamente.'
    }

    if (statusCode === 400) {
      if (bodyLower.includes('not found') || bodyLower.includes('invalid number')) {
        return 'Número inválido ou não encontrado no WhatsApp.'
      }
      if (bodyLower.includes('media') || bodyLower.includes('file') || bodyLower.includes('format')) {
        return 'Arquivo não suportado. Tente enviar em outro formato.'
      }
      return 'Dados inválidos enviados ao WhatsApp. Verifique e tente novamente.'
    }

    if (statusCode !== undefined && statusCode >= 500) {
      return 'Erro no servidor Z-API. Tente novamente em alguns minutos.'
    }
  }

  return FALLBACK_USER_MESSAGE
}

/**
 * Extrai informações estruturadas de erro a partir de exceptions lançados pelos providers.
 *
 * Padrões reconhecidos:
 *  - Mensagens PT-BR diretas (connection guards, erros já tratados)
 *  - Meta Graph API: JSON com `error.code` numérico
 *  - Evolution API: prefixo "Evolution API" + status + body
 *  - Z-API: prefixo "Z-API" + status + body
 *
 * Garante que `userMessage` SEMPRE seja preenchido — usa fallback genérico se nenhum padrão bater.
 */
export function parseProviderError(error: unknown): ProviderDeliveryError {
  const msg = error instanceof Error ? error.message : String(error)

  // --- 1. Mensagens PT-BR diretas: já estão traduzidas, usar como estão ---
  if (isDirectPortugueseMessage(msg)) {
    return { message: msg, userMessage: msg }
  }

  // --- 2. Extrair HTTP status code do padrão "(NNN)" ---
  const statusMatch = msg.match(/\((\d{3})\)/)
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined

  // --- 3. Tentar parsear JSON body ---
  const jsonMatch = msg.match(/:\s*(\{[\s\S]+\})\s*$/)
  let parsedBody: Record<string, unknown> | null = null
  if (jsonMatch) {
    try {
      parsedBody = JSON.parse(jsonMatch[1]) as Record<string, unknown>
    } catch {
      // JSON inválido — continuar com pattern matching textual
    }
  }

  // --- 4. Meta Graph API: JSON com error.code numérico ---
  if (parsedBody?.error && typeof (parsedBody.error as Record<string, unknown>).code === 'number') {
    const metaError = parsedBody.error as Record<string, unknown>
    const code = metaError.code as number
    const technicalMessage = (metaError.error_user_msg ?? metaError.message) as string | undefined

    return {
      code,
      title: metaError.title as string | undefined,
      message: technicalMessage,
      userMessage: META_ERROR_MESSAGES[code] ?? technicalMessage ?? FALLBACK_USER_MESSAGE,
    }
  }

  // --- 5. Determinar provider pelo prefixo da mensagem ---
  const isEvolution = msg.startsWith('Evolution API')
  const isZApi = msg.startsWith('Z-API')
  const bodyText = extractBodyText(msg)

  // --- 6. Pattern matching por status code + body ---
  const userMessage = matchProviderError(statusCode, bodyText, isEvolution, isZApi)

  return {
    code: statusCode,
    message: msg,
    userMessage,
  }
}
