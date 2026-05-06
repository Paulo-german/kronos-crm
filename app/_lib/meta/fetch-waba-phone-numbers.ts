import type { MetaWabaPhoneNumber, MetaWabaPhoneNumbersResponse } from './types'
import { META_API_VERSION } from './constants'

const PHONE_FIELDS = [
  'id',
  'display_phone_number',
  'verified_name',
  'quality_rating',
  'code_verification_status',
  'platform_type',
].join(',')

/**
 * Busca todos os numeros de telefone de um WABA via Graph API.
 * Camada de integracao pura — sem DB, sem RBAC.
 * Sem cache: chamada on-demand que precisa ser sempre fresca
 * (usuario pode ter adicionado numero no Business Manager instantes antes).
 */
export async function fetchWabaPhoneNumbers(
  wabaId: string,
  accessToken: string,
): Promise<MetaWabaPhoneNumber[]> {
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers`)
  url.searchParams.set('fields', PHONE_FIELDS)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Meta fetchWabaPhoneNumbers failed (${response.status}): ${errorBody}`)
  }

  const data = (await response.json().catch(() => null)) as MetaWabaPhoneNumbersResponse | null

  if (!data?.data || !Array.isArray(data.data)) {
    throw new Error('Meta fetchWabaPhoneNumbers: resposta invalida da Graph API')
  }

  return data.data
}
