export interface ReportSection {
  slug: string
  label: string
  description: string
  iconName: string
  requiresElevated?: boolean
}

export const REPORT_SECTIONS: readonly ReportSection[] = [
  {
    slug: 'overview',
    label: 'Visão geral',
    description: 'KPIs consolidados, métrica âncora e progresso das metas da organização.',
    iconName: 'Compass',
  },
  {
    slug: 'pipeline',
    label: 'Pipeline',
    description: 'Funil de conversão, velocidade e deals em risco.',
    iconName: 'GitBranch',
  },
  {
    slug: 'team',
    label: 'Time',
    description: 'Performance por vendedor e progresso das metas individuais.',
    iconName: 'Users',
    requiresElevated: true,
  },
  {
    slug: 'products',
    label: 'Produtos',
    description: 'Mix de vendas e receita por produto.',
    iconName: 'Package',
  },
  {
    slug: 'lost-deals',
    label: 'Perdas',
    description: 'Distribuição de perdas por estágio e motivo.',
    iconName: 'XCircle',
  },
  {
    slug: 'inbox',
    label: 'Inbox',
    description: 'Volume de conversas, canais, performance da equipe e IA.',
    iconName: 'Inbox',
  },
  {
    slug: 'ai',
    label: 'IA',
    description: 'Consumo de créditos, execuções por agente e plano.',
    iconName: 'Sparkles',
  },
] as const

export type ReportSlug = (typeof REPORT_SECTIONS)[number]['slug']

export function findReportSection(slug: string): ReportSection | undefined {
  return REPORT_SECTIONS.find((section) => section.slug === slug)
}
