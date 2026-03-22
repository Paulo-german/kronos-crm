import type { ZApiConfig } from './types'

const ZAPI_BASE_URL = 'https://api.z-api.io'

function buildUrl(config: ZApiConfig, endpoint: string): string {
  return `${ZAPI_BASE_URL}/instances/${config.instanceId}/token/${config.token}/${endpoint}`
}

function buildHeaders(clientToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Client-Token': clientToken,
  }
}

export async function zapiGet(config: ZApiConfig, endpoint: string): Promise<Response> {
  return fetch(buildUrl(config, endpoint), {
    method: 'GET',
    headers: buildHeaders(config.clientToken),
  })
}

export async function zapiPost(
  config: ZApiConfig,
  endpoint: string,
  body: unknown,
): Promise<Response> {
  return fetch(buildUrl(config, endpoint), {
    method: 'POST',
    headers: buildHeaders(config.clientToken),
    body: JSON.stringify(body),
  })
}
