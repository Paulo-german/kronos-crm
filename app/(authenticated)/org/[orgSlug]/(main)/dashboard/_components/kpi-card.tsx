import Link from 'next/link'
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
  }
  href?: string
}

export function KpiCard({ title, value, icon: Icon, variation, href }: KpiCardProps) {
  const card = (
    <Card className={cn(
      'flex h-full w-full flex-col',
      href && 'hover:border-primary/50 transition-colors cursor-pointer',
    )}>
      <CardContent className="flex flex-1 flex-col justify-center p-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {variation && (
            <span
              className={cn(
                'mb-0.5 text-xs font-medium',
                variation.isPositive ? 'text-kronos-green' : 'text-kronos-red',
              )}
            >
              {variation.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href} className="h-full">{card}</Link>
  }

  return card
}
