/**
 * Inscreve o app Meta na WABA (WhatsApp Business Account) para receber webhooks.
 * Deve ser chamado apos o Embedded Signup para ativar o recebimento de mensagens.
 */
export async function subscribeMetaApp(wabaId: string, accessToken: string): Promise<void> {
  const apiVersion = process.env.META_API_VERSION ?? 'v25.0'

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${wabaId}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta subscribeApp failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as { success?: boolean } | null

  if (!data?.success) {
    throw new Error(`Meta subscribeApp: unexpected response — ${JSON.stringify(data)}`)
  }
}
