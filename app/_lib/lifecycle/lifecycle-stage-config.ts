import { Filter, Sprout, Star, Target, type LucideIcon } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'

/**
 * Configuração visual por estágio do lifecycle.
 *
 * - `label`: texto PT-BR exibido em cards, tooltips e timelines.
 * - `icon`: ícone Lucide usado no header dos cards do funil.
 * - `colorClassName`: classe Tailwind aplicada ao ícone/badge do estágio.
 * - `chartColor`: valor CSS (HSL token) consumido pelo Recharts no AreaChart de evolução.
 *
 * As cores cobrem a progressão LEAD → CUSTOMER em tom crescente de "valor capturado":
 * neutro (LEAD) → primary (QUALIFIED) → amber (OPPORTUNITY) → emerald (CUSTOMER).
 */

export interface LifecycleStageVisualConfig {
  label: string
  icon: LucideIcon
  colorClassName: string
  chartColor: string
}

export const LIFECYCLE_STAGE_CONFIG: Record<LifecycleStage, LifecycleStageVisualConfig> = {
  [LifecycleStage.LEAD]: {
    label: 'Lead',
    icon: Sprout,
    colorClassName: 'text-muted-foreground',
    chartColor: 'hsl(var(--muted-foreground))',
  },
  [LifecycleStage.QUALIFIED]: {
    label: 'Qualificado',
    icon: Filter,
    colorClassName: 'text-primary',
    chartColor: 'hsl(var(--primary))',
  },
  [LifecycleStage.OPPORTUNITY]: {
    label: 'Oportunidade',
    icon: Target,
    colorClassName: 'text-amber-500',
    chartColor: '#f59e0b',
  },
  [LifecycleStage.CUSTOMER]: {
    label: 'Cliente',
    icon: Star,
    colorClassName: 'text-emerald-500',
    chartColor: '#10b981',
  },
}

// Ordem visual canônica usada em listagens, funis e arrays de pontos do gráfico
export const LIFECYCLE_STAGE_ORDER: LifecycleStage[] = [
  LifecycleStage.LEAD,
  LifecycleStage.QUALIFIED,
  LifecycleStage.OPPORTUNITY,
  LifecycleStage.CUSTOMER,
]
