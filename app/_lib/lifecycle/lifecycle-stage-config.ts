import { Crown, Flame, Handshake, UserPlus, type LucideIcon } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'

/**
 * Configuração visual por estágio do lifecycle.
 *
 * - `label`: texto PT-BR exibido em cards, tooltips e timelines.
 * - `icon`: ícone Lucide usado no header dos cards do funil.
 * - `colorClassName`: classe Tailwind aplicada ao ícone/badge do estágio.
 * - `badgeClassName`: classes completas para badges (bg + text + border).
 * - `chartColor`: valor CSS (HSL token) consumido pelo Recharts no AreaChart de evolução.
 *
 * Progressão visual LEAD → CUSTOMER:
 * cinza (LEAD) → laranja (QUALIFIED) → azul (OPPORTUNITY) → roxo/primary (CUSTOMER)
 */

export interface LifecycleStageVisualConfig {
  label: string
  icon: LucideIcon
  colorClassName: string
  badgeClassName: string
  chartColor: string
}

export const LIFECYCLE_STAGE_CONFIG: Record<LifecycleStage, LifecycleStageVisualConfig> = {
  [LifecycleStage.LEAD]: {
    label: 'Lead',
    icon: UserPlus,
    colorClassName: 'text-zinc-400',
    badgeClassName: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    chartColor: 'hsl(var(--muted-foreground))',
  },
  [LifecycleStage.QUALIFIED]: {
    label: 'Qualificado',
    icon: Flame,
    colorClassName: 'text-orange-500',
    badgeClassName: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    chartColor: '#f97316',
  },
  [LifecycleStage.OPPORTUNITY]: {
    label: 'Oportunidade',
    icon: Handshake,
    colorClassName: 'text-blue-500',
    badgeClassName: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    chartColor: '#3b82f6',
  },
  [LifecycleStage.CUSTOMER]: {
    label: 'Cliente',
    icon: Crown,
    colorClassName: 'text-kronos-purple',
    badgeClassName: 'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20',
    chartColor: 'hsl(var(--kronos-purple-hsl))',
  },
}

// Ordem visual canônica usada em listagens, funis e arrays de pontos do gráfico
export const LIFECYCLE_STAGE_ORDER: LifecycleStage[] = [
  LifecycleStage.LEAD,
  LifecycleStage.QUALIFIED,
  LifecycleStage.OPPORTUNITY,
  LifecycleStage.CUSTOMER,
]
