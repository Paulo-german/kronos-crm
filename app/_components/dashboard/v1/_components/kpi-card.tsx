import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  variation?: {
    value: string
    isPositive: boolean
    // Quando false, não há base de comparação real (período anterior zerado);
    // o badge é ocultado para não exibir um "+100%"/"-100%" enganoso.
    hasBaseline?: boolean
  }
  href?: string
  iconClassName?: string
  iconBgClassName?: string
  footnote?: string
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  variation,
  href,
  iconClassName,
  iconBgClassName,
  footnote,
}: KpiCardProps) {
  const showVariation = variation != null && variation.hasBaseline !== false
  const card = (
    <Card
      className={cn(
        'flex h-full w-full flex-col transition-all duration-200',
        href && 'cursor-pointer hover:border-primary/50 hover:shadow-md',
      )}
    >
      <CardContent className="flex flex-1 flex-col justify-center p-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-lg',
              iconBgClassName ?? 'bg-muted',
            )}
          >
            <Icon
              className={cn('size-4', iconClassName ?? 'text-muted-foreground')}
            />
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {showVariation && (
            <span
              className={cn(
                'mb-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                variation.isPositive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
              )}
            >
              {variation.isPositive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {variation.value}
            </span>
          )}
        </div>
        {footnote && (
          <p className="mt-1 text-[10px] text-muted-foreground">{footnote}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="h-full">
        {card}
      </Link>
    )
  }

  return card
}
