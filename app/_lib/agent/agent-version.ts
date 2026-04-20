// Mapa de alias para suportar tanto os nomes legados (v1/v2/v3) quanto os canônicos
// durante a janela de transição pós-deploy. Remover aliases legacy na próxima release.
export const AGENT_VERSION_ALIAS: Record<string, 'single-v1' | 'single-v2' | 'crew-v1'> = {
  // legacy
  'v1': 'single-v1',
  'v2': 'single-v2',
  'v3': 'crew-v1',
  // canonical
  'single-v1': 'single-v1',
  'single-v2': 'single-v2',
  'crew-v1': 'crew-v1',
}

export function resolveCanonicalAgentVersion(raw: string | null | undefined): 'single-v1' | 'single-v2' | 'crew-v1' {
  return AGENT_VERSION_ALIAS[raw ?? 'v1'] ?? 'single-v1'
}
