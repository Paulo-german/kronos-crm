import { IG_API_VERSION } from './constants'

/**
 * Inscreve o app Meta no endpoint de mensagens do IG Business User.
 * Deve ser chamado apos o OAuth do Embedded Signup para ativar o recebimento de webhooks.
 *
 * Endpoint: POST /{igUserId}/subscribed_apps
 * Documentacao: https://developers.facebook.com/docs/messenger-platform/instagram/get-started
 */
export async function subscribeInstagramApp(igUserId: string, accessToken: string): Promise<void> {
  const url = `https://graph.facebook.com/${IG_API_VERSION}/${igUserId}/subscribed_apps`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      subscribed_fields: ['messages', 'messaging_seen', 'messaging_referrals'],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Instagram subscribed_apps failed (${response.status}): ${errorBody}`,
    )
  }

  const data = (await response.json().catch(() => null)) as { success?: boolean } | null

  if (data?.success !== true) {
    throw new Error(
      `Instagram subscribed_apps retornou success=false para igUserId=${igUserId}`,
    )
  }
}
