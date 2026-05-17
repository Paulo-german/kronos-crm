/**
 * Constantes de threshold do Copiloto compartilhadas entre data-access e UI.
 * O `page.tsx` (Fase 3) importará daqui para garantir que os parâmetros passados
 * para getStalledDeals / getReactivationCandidates sejam os mesmos usados para
 * computar os badge counts em getOrgInsightsOverview.
 */

/** Deals sem movimentação há mais de N dias são considerados estagnados. */
export const STALE_DEAL_DAYS = 14

/** LTV mínimo (R$) para um cliente DORMANT aparecer na aba de Reativação. */
export const REACTIVATION_MIN_LTV = 500
