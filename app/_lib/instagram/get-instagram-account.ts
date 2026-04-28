import { IG_API_VERSION } from './constants'
import type { InstagramAccountResponse } from './types'

/**
 * Busca o username (@handle) da conta Instagram Business via Graph API.
 * Usado apos o OAuth para persistir o username no Inbox (campo metaIgUsername).
 *
 * Endpoint: GET /{igUserId}?fields=username,name
 */
export async function getInstagramUsername(igUserId: string, accessToken: string): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${IG_API_VERSION}/${igUserId}`)
  url.searchParams.set('fields', 'username,name')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Instagram Graph API getInstagramUsername failed (${response.status}): ${errorBody}`,
    )
  }

  const data = (await response.json().catch(() => null)) as InstagramAccountResponse | null

  if (!data?.username) {
    throw new Error(
      `Instagram Graph API nao retornou username para igUserId=${igUserId}. Verifique as permissoes do token (instagram_business_basic).`,
    )
  }

  return data.username
}
