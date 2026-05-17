import type { LucideIcon } from 'lucide-react'
import {
  Compass,
  GitBranch,
  Users,
  Package,
  XCircle,
  Inbox,
  Sparkles,
} from 'lucide-react'

export interface ReportSection {
  slug: string
  label: string
  description: string
  icon: LucideIcon
  requiresElevated?: boolean
}

export const REPORT_SECTIONS: readonly ReportSection[] = [
  {
    slug: 'overview',
    label: 'Visão geral',
    description: 'KPIs consolidados, métrica âncora e progresso das metas da organização.',
    icon: Compass,
  },
  {
    slug: 'pipeline',
    label: 'Pipeline',
    description: 'Funil de conversão, velocidade e deals em risco.',
    icon: GitBranch,
  },
  {
    slug: 'team',
    label: 'Time',
    description: 'Performance por vendedor e progresso das metas individuais.',
    icon: Users,
    requiresElevated: true,
  },
  {
    slug: 'products',
    label: 'Produtos',
    description: 'Mix de vendas e receita por produto.',
    icon: Package,
  },
  {
    slug: 'lost-deals',
    label: 'Perdas',
    description: 'Distribuição de perdas por estágio e motivo.',
    icon: XCircle,
  },
  {
    slug: 'inbox',
    label: 'Inbox',
    description: 'Volume de conversas, canais, performance da equipe e IA.',
    icon: Inbox,
  },
  {
    slug: 'ai',
    label: 'IA',
    description: 'Consumo de créditos, execuções por agente e plano.',
    icon: Sparkles,
  },
] as const

export type ReportSlug = (typeof REPORT_SECTIONS)[number]['slug']

export function findReportSection(slug: string): ReportSection | undefined {
  return REPORT_SECTIONS.find((section) => section.slug === slug)
}
