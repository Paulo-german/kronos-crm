import type {
  MetaTemplate,
  MetaTemplateComponent,
  MetaTemplateListResponse,
  CreateMetaTemplatePayload,
  MetaTemplateSendComponent,
} from './types'

// Mapeamento de error_subcode do Meta para mensagens legíveis em português
const META_TEMPLATE_ERROR_MESSAGES: Record<number, string> = {
  2388293: 'O texto tem muitas variáveis para o seu tamanho. Reduza o número de variáveis ou aumente o texto.',
  2388299: 'Variáveis não podem estar no início ou no final do texto. Adicione texto antes e depois de cada variável.',
  2388030: 'Já existe um template com esse nome. Escolha um nome diferente.',
  2388049: 'O texto contém caracteres não permitidos. Use apenas texto e variáveis {{N}}.',
  2388047: 'O nome do template é inválido. Use apenas letras minúsculas, números e underscore.',
  2388066: 'Limite de templates atingido para esta conta. Delete templates não utilizados.',
}

/** Extrai mensagem legível de um erro da Graph API de templates */
function parseMetaTemplateError(responseBody: string, statusCode: number): string {
  try {
    const parsed = JSON.parse(responseBody) as {
      error?: {
        error_subcode?: number
        error_user_msg?: string
        message?: string
      }
    }

    const subcode = parsed.error?.error_subcode
    if (subcode && META_TEMPLATE_ERROR_MESSAGES[subcode]) {
      return META_TEMPLATE_ERROR_MESSAGES[subcode]
    }

    // Fallback: usar error_user_msg do Meta (em inglês, mas melhor que o código cru)
    if (parsed.error?.error_user_msg) {
      return parsed.error.error_user_msg
    }

    return parsed.error?.message ?? `Erro ao processar template (${statusCode})`
  } catch {
    return `Erro inesperado ao processar template (${statusCode})`
  }
}

function getGraphApiBaseUrl(): string {
  const version = process.env.META_API_VERSION ?? 'v25.0'
  return `https://graph.facebook.com/${version}`
}

interface FetchTemplatesOptions {
  limit?: number
  after?: string
  status?: string
}

/**
 * Lista os templates do WABA. Suporta paginacao e filtro por status.
 */
export async function fetchMetaTemplates(
  wabaId: string,
  accessToken: string,
  options: FetchTemplatesOptions = {},
): Promise<MetaTemplateListResponse> {
  const baseUrl = getGraphApiBaseUrl()

  const params = new URLSearchParams({
    fields: 'id,name,language,status,category,components,quality_score',
    limit: String(options.limit ?? 100),
  })

  if (options.after) params.set('after', options.after)
  if (options.status) params.set('status', options.status)

  const response = await fetch(`${baseUrl}/${wabaId}/message_templates?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    // Garantir que o Next.js nao cache esta requisicao no nivel do fetch
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta Graph API fetchTemplates failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as MetaTemplateListResponse
  return data
}

/**
 * Cria um novo template no WABA.
 * Retorna o id, status e category do template criado pelo Meta.
 */
export async function createMetaTemplate(
  wabaId: string,
  accessToken: string,
  payload: CreateMetaTemplatePayload,
): Promise<{ id: string; status: string; category: string }> {
  const baseUrl = getGraphApiBaseUrl()

  const response = await fetch(`${baseUrl}/${wabaId}/message_templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(parseMetaTemplateError(errorBody, response.status))
  }

  const data = (await response.json()) as { id: string; status: string; category: string }
  return data
}

/**
 * Edita um template existente (APPROVED: altera components, REJECTED/PAUSED: resubmissao).
 * Usa POST /{waba_id}/message_templates/{template_id} — somente components podem ser alterados,
 * name/language/category sao imutaveis apos criacao.
 */
export async function editMetaTemplate(
  wabaId: string,
  accessToken: string,
  templateId: string,
  components: MetaTemplateComponent[],
): Promise<{ success: boolean }> {
  const baseUrl = getGraphApiBaseUrl()

  const response = await fetch(`${baseUrl}/${wabaId}/message_templates/${templateId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ components }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(parseMetaTemplateError(errorBody, response.status))
  }

  return { success: true }
}

/**
 * Deleta um template pelo nome.
 * Deleta TODAS as versoes de lingua do template com aquele nome.
 */
export async function deleteMetaTemplate(
  wabaId: string,
  accessToken: string,
  templateName: string,
): Promise<{ success: boolean }> {
  const baseUrl = getGraphApiBaseUrl()

  const response = await fetch(
    `${baseUrl}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta Graph API deleteTemplate failed (${response.status}): ${errorBody}`)
  }

  return { success: true }
}

/**
 * Envia uma template message para um destinatario.
 * Retorna o wamid da mensagem enviada.
 */
export async function sendMetaTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  language: string,
  components?: MetaTemplateSendComponent[],
): Promise<string> {
  const baseUrl = getGraphApiBaseUrl()

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      ...(components && components.length > 0 ? { components } : {}),
    },
  }

  const response = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Meta Graph API sendTemplateMessage failed (${response.status}): ${errorBody}`,
    )
  }

  const data = (await response.json()) as { messages?: Array<{ id: string }> }
  const messageId = data.messages?.[0]?.id

  if (!messageId) {
    throw new Error('Meta Graph API sendTemplateMessage: no messageId returned')
  }

  return messageId
}

/**
 * Faz upload de midia para usar como header de template (IMAGE, VIDEO, DOCUMENT).
 * Usa Resumable Upload API em 2 etapas:
 * 1. POST /{app_id}/uploads — cria sessao de upload → retorna { id: "upload:xxx" }
 * 2. POST /{upload_session_id} — envia bytes → retorna { h: "handle_string" }
 * O handle retornado e passado como example.header_handle na criacao do template.
 */
export async function uploadTemplateMedia(
  accessToken: string,
  fileBase64: string,
  fileLength: number,
  fileType: string,
): Promise<string> {
  const baseUrl = getGraphApiBaseUrl()
  const appId = process.env.NEXT_PUBLIC_META_APP_ID

  if (!appId) {
    throw new Error('NEXT_PUBLIC_META_APP_ID env var is required for Resumable Upload API')
  }

  // Step 1: Criar sessao de upload
  const createSessionResponse = await fetch(`${baseUrl}/${appId}/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      file_length: fileLength,
      file_type: fileType,
      access_token: accessToken,
    }),
  })

  if (!createSessionResponse.ok) {
    const errorBody = await createSessionResponse.text().catch(() => 'unknown')
    throw new Error(`Meta Resumable Upload createSession failed (${createSessionResponse.status}): ${errorBody}`)
  }

  const session = (await createSessionResponse.json()) as { id: string }

  if (!session.id) {
    throw new Error('Meta Resumable Upload createSession: no session id returned')
  }

  // Step 2: Enviar bytes do arquivo
  const binaryString = atob(fileBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex++) {
    bytes[byteIndex] = binaryString.charCodeAt(byteIndex)
  }

  const uploadResponse = await fetch(`${baseUrl}/${session.id}`, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_offset: '0',
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  })

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => 'unknown')
    throw new Error(`Meta Resumable Upload sendFile failed (${uploadResponse.status}): ${errorBody}`)
  }

  const uploadResult = (await uploadResponse.json()) as { h?: string }

  if (!uploadResult.h) {
    throw new Error('Meta Resumable Upload: no handle (h) returned')
  }

  return uploadResult.h
}

// Re-export do tipo para conveniencia
export type { MetaTemplate }
