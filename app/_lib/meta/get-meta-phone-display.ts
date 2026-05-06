import type { MetaPhoneNumberResponse } from './types'
import { META_API_VERSION } from './constants'

/**
 * Busca o numero de telefone formatado para exibicao na Graph API.
 * Desnormalizado no banco para evitar chamadas extras a Graph API na UI.
 */
export async function getMetaPhoneDisplay(
  phoneNumberId: string,
  accessToken: string,
): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}`)
  url.searchParams.set('fields', 'display_phone_number')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta getPhoneDisplay failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as MetaPhoneNumberResponse | null

  if (!data?.display_phone_number) {
    throw new Error(`Meta getPhoneDisplay: no display_phone_number in response`)
  }

  return data.display_phone_number
}
