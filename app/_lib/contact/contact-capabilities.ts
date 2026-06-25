/**
 * Capabilities do contato derivadas dos módulos que a organização possui.
 * Contato é transversal; cada módulo "acende" suas features no contato.
 *
 * Donos (decisão registrada em PLAN-contacts-modular.md):
 * - deals / pipeline / customFields → módulo `crm`
 * - inbox (abrir conversa) → módulo `inbox`
 *
 * Nota: health score NÃO é capability aqui — já tem gating próprio por plano
 * (`isScoreEnabled` via SCORE_ELIGIBLE_PRODUCT_KEYS). Não duplicar.
 */
export interface ContactCapabilities {
  // Negociação: deal inline no formulário, deals no card/detalhe, filtro hasDeals, pipeline
  deals: boolean
  // Campos personalizados (custom fields)
  customFields: boolean
  // Botão/atalho para abrir conversa no Inbox
  inbox: boolean
}

/**
 * Monta as capabilities a partir dos slugs de módulo ativos da organização.
 */
export function resolveContactCapabilities(
  moduleSlugs: string[],
): ContactCapabilities {
  const has = (slug: string) => moduleSlugs.includes(slug)
  const crm = has('crm')

  return {
    deals: crm,
    customFields: crm,
    inbox: has('inbox'),
  }
}
