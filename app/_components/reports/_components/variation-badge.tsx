import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/_lib/utils'
import type { formatVariation } from '@/_utils/date-range'

const SIZE_STYLES = {
  sm: { wrapper: 'px-1.5 py-0.5 text-xs', icon: 'size-3' },
  xs: { wrapper: 'px-1 py-0.5 text-[10px] tabular-nums', icon: 'size-2.5' },
} as const

interface VariationBadgeProps {
  variation: ReturnType<typeof formatVariation>
  // Quando true, alta = vermelho e queda = verde (ex.: deals perdidos ou
  // ciclo médio, onde "menos é melhor"). O ícone sempre reflete a direção
  // numérica real; apenas a cor é invertida.
  invertPolarity?: boolean
  size?: keyof typeof SIZE_STYLES
  className?: string
}

/**
 * Badge de variação vs. período anterior, compartilhado por todas as seções
 * de reports. Oculta-se automaticamente quando não há base de comparação
 * real (`hasBaseline: false`), evitando o "+100%" enganoso para itens que
 * não existiam no período anterior.
 */
export function VariationBadge({
  variation,
  invertPolarity = false,
  size = 'sm',
  className,
}: VariationBadgeProps) {
  if (!variation.hasBaseline) return null

  const styles = SIZE_STYLES[size]
  const isGood = invertPolarity ? !variation.isPositive : variation.isPositive

  return (
    <span
      className={cn(
        'ml-1.5 inline-flex items-center gap-0.5 rounded-full font-semibold',
        styles.wrapper,
        isGood
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
        className,
      )}
    >
      {variation.isPositive ? (
        <TrendingUp className={styles.icon} />
      ) : (
        <TrendingDown className={styles.icon} />
      )}
      {variation.value}
    </span>
  )
}
