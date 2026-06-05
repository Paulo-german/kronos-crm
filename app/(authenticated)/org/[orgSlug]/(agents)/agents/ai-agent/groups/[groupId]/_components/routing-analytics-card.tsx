import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Progress } from '@/_components/ui/progress'
import { BarChart3Icon } from 'lucide-react'
import type { AgentGroupRoutingStatsDto } from '@/_data-access/agent-group/get-agent-group-routing-stats'

interface RoutingAnalyticsCardProps {
  stats: AgentGroupRoutingStatsDto
}

export function RoutingAnalyticsCard({ stats }: RoutingAnalyticsCardProps) {
  const maxCount = stats.workers.reduce((max, worker) => Math.max(max, worker.count), 0)

  const hasData = stats.routingsWithMetadata > 0

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Roteamento (últimos 30 dias)</CardTitle>
            <CardDescription>
              Distribuição de conversas por worker e taxa de uso do fallback.
            </CardDescription>
          </div>
          {hasData && (
            <div className="flex shrink-0 gap-4 text-right text-sm">
              <div>
                <p className="font-semibold tabular-nums">{stats.routingsWithMetadata}</p>
                <p className="text-xs text-muted-foreground">roteamentos</p>
              </div>
              <div>
                <p className="font-semibold tabular-nums">
                  {stats.fallbackRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">fallback</p>
              </div>
              <div>
                <p className="font-semibold tabular-nums">
                  {stats.avgConfidence.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">confiança média</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-8">
            <BarChart3Icon className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Sem roteamentos registrados nos últimos 30 dias.
            </p>
            {stats.totalRoutingsAllTime > 0 && (
              <p className="text-xs text-muted-foreground/70">
                {stats.totalRoutingsAllTime} roteamento
                {stats.totalRoutingsAllTime !== 1 ? 's' : ''} registrado
                {stats.totalRoutingsAllTime !== 1 ? 's' : ''} antes do registro detalhado.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {stats.workers.map((worker) => {
              const progressValue = maxCount > 0 ? (worker.count / maxCount) * 100 : 0

              return (
                <li key={worker.agentId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="truncate text-sm font-medium"
                        title={worker.agentName}
                      >
                        {worker.agentName}
                      </span>
                      {!worker.isCurrentMember && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          removido
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {worker.share.toFixed(1)}%
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {worker.count}
                      </span>
                    </div>
                  </div>
                  <Progress value={progressValue} className="h-1.5" />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
