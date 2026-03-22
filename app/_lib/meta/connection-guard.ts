/**
 * Valida que o phoneNumberId + accessToken da Meta Cloud API estao funcionais.
 * Faz um GET leve no Graph API para verificar se o token eh valido e o numero esta ativo.
 * Lanca erro explicito se invalido — evita que mensagens sejam salvas como "enviadas".
 */
export async function assertMetaConnected(
  phoneNumberId: string,
  accessToken: string,
): Promise<void> {
  const version = process.env.META_API_VERSION ?? 'v25.0'
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=id`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new Error(
        `WhatsApp Business desconectado. Verifique as credenciais Meta Cloud API. (${response.status}: ${errorBody})`,
      )
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('WhatsApp Business desconectado')) {
      throw error
    }
    throw new Error(
      'Não foi possível verificar a conexão com a Meta Cloud API. Verifique sua conexão.',
    )
  }
}
