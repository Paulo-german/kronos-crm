// Cache curto para evitar health check HTTP em toda request de envio
const CONNECTION_CACHE_TTL_MS = 30_000
const connectionCache = new Map<string, { connected: boolean; expiresAt: number }>()

/**
 * Valida que o phoneNumberId + accessToken da Meta Cloud API estao funcionais.
 * Faz um GET leve no Graph API para verificar se o token eh valido e o numero esta ativo.
 * Lanca erro explicito se invalido — evita que mensagens sejam salvas como "enviadas".
 * Usa cache de 30s para evitar bombardear a Graph API com health checks.
 */
export async function assertMetaConnected(
  phoneNumberId: string,
  accessToken: string,
): Promise<void> {
  const cached = connectionCache.get(phoneNumberId)

  if (cached && Date.now() < cached.expiresAt) {
    if (!cached.connected) {
      throw new Error(
        'WhatsApp Business desconectado. Verifique as credenciais Meta Cloud API. (401)',
      )
    }
    return
  }

  const version = process.env.META_API_VERSION ?? 'v25.0'
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=id`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      connectionCache.set(phoneNumberId, {
        connected: false,
        expiresAt: Date.now() + CONNECTION_CACHE_TTL_MS,
      })
      throw new Error(
        `WhatsApp Business desconectado. Verifique as credenciais Meta Cloud API. (${response.status}: ${errorBody})`,
      )
    }

    connectionCache.set(phoneNumberId, {
      connected: true,
      expiresAt: Date.now() + CONNECTION_CACHE_TTL_MS,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('WhatsApp Business desconectado')) {
      throw error
    }
    // Erro de rede — nao cachear, pode ser transitorio
    throw new Error(
      'Não foi possível verificar a conexão com a Meta Cloud API. Verifique sua conexão.',
    )
  }
}
