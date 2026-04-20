/**
 * Feature flags controladas por env vars.
 * Centraliza leitura para facilitar buscas e rollback cirúrgico.
 */

/**
 * Habilita o overhaul do pipeline single-v2:
 *  - Fase 2: buildPromptBaseContext + compileSingleSystemPrompt no lugar de buildSystemPrompt
 *  - Fases futuras adicionadas atrás desta mesma flag
 *
 * Default false — rollback imediato via env var sem deploy.
 */
export function isSingleV2OverhaulEnabled(): boolean {
  return process.env.SINGLE_V2_OVERHAUL_ENABLED === 'true'
}
