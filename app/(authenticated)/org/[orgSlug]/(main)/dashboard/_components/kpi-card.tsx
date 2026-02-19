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
}

export function KpiCard({ title, value, icon: Icon, variation }: KpiCardProps) {
  return (
    <Card className="flex h-full w-full flex-col">
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
}
