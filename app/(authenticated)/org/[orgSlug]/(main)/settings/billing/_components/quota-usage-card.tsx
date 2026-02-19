import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Progress } from '@/_components/ui/progress'
import { cn } from '@/_lib/utils'
import type { QuotaSummary } from '@/_data-access/billing/get-all-quotas'

interface QuotaUsageCardProps {
  quotas: QuotaSummary
}

const ENTITY_LABELS: Record<keyof QuotaSummary, string> = {
  contact: 'Contatos',
  deal: 'Negocios',
  product: 'Produtos',
  member: 'Membros',
}

function getProgressColor(pct: number): string {
  if (pct >= 90) return '[&>div]:bg-destructive'
  if (pct >= 70) return '[&>div]:bg-[hsl(var(--kronos-yellow))]'
  return ''
}

export const QuotaUsageCard = ({ quotas }: QuotaUsageCardProps) => {
  const entries = (Object.keys(ENTITY_LABELS) as (keyof QuotaSummary)[]).map(
    (key) => ({
      key,
      label: ENTITY_LABELS[key],
      ...quotas[key],
      pct: quotas[key].limit > 0
        ? Math.round((quotas[key].current / quotas[key].limit) * 100)
        : 0,
    }),
  )

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Uso do plano</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.key} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{entry.label}</span>
              <span className="text-xs text-muted-foreground">
                {entry.current} de {entry.limit}
              </span>
            </div>
            <Progress
              value={entry.pct}
              className={cn('h-2', getProgressColor(entry.pct))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
