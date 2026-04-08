'use client'

import { Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { AgentBreakdownEntry } from '@/_data-access/dashboard'
import { formatNumber } from '@/_utils/format-number'

interface AiAgentBreakdownCardProps {
  data: AgentBreakdownEntry[]
}

function formatDuration(avgDurationMs: number): string {
  if (avgDurationMs < 1000) {
    return `${Math.round(avgDurationMs)}ms`
  }

  const seconds = avgDurationMs / 1000
  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`
  }

  return `${Math.round(seconds)}s`
}

function SuccessRateBadge({ rate }: { rate: number }) {
  const isGreen = rate >= 90
  const isYellow = rate >= 70 && rate < 90

  return (
    <Badge
      variant="secondary"
      className={cn(
        'rounded-full border-transparent',
        isGreen && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
        isYellow && 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        !isGreen && !isYellow && 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
      )}
    >
      {rate.toFixed(0)}%
    </Badge>
  )
}

export function AiAgentBreakdownCard({ data }: AiAgentBreakdownCardProps) {
  // Crédito máximo para calcular a barra de progresso proporcional
  const maxCredits = Math.max(...data.map((entry) => entry.totalCredits), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4 text-muted-foreground" />
          Execuções por Agente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="h-8 text-xs">Agente</TableHead>
              <TableHead className="h-8 text-right text-xs">Execuções</TableHead>
              <TableHead className="h-8 text-right text-xs">Créditos</TableHead>
              <TableHead className="h-8 text-right text-xs">Taxa de Sucesso</TableHead>
              <TableHead className="h-8 text-right text-xs">Tempo Médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => (
              <TableRow
                key={entry.agentId ?? 'router'}
                className="border-border/30 hover:bg-muted/30"
              >
                {/* Coluna: nome do agente */}
                <TableCell>
                  {entry.agentId === null ? (
                    <span className="italic text-muted-foreground">Router</span>
                  ) : (
                    <span className="font-medium">{entry.agentName}</span>
                  )}
                </TableCell>

                {/* Coluna: total de execuções */}
                <TableCell className="text-right tabular-nums">
                  {formatNumber(entry.totalExecutions)}
                </TableCell>

                {/* Coluna: créditos com barra de progresso */}
                <TableCell>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular-nums">{formatNumber(entry.totalCredits)}</span>
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--kronos-purple)] transition-all duration-300"
                        style={{
                          width: `${(entry.totalCredits / maxCredits) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>

                {/* Coluna: taxa de sucesso */}
                <TableCell className="text-right">
                  <SuccessRateBadge rate={entry.successRate} />
                </TableCell>

                {/* Coluna: tempo médio */}
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatDuration(entry.avgDurationMs)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Legenda de status resumida */}
        {data.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-border/30 pt-3 text-xs text-muted-foreground">
            {data.some((entry) => entry.failedCount > 0) && (
              <span>
                Total de falhas:{' '}
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatNumber(data.reduce((sum, entry) => sum + entry.failedCount, 0))}
                </span>
              </span>
            )}
            {data.some((entry) => entry.skippedCount > 0) && (
              <span>
                Pulados:{' '}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {formatNumber(data.reduce((sum, entry) => sum + entry.skippedCount, 0))}
                </span>
              </span>
            )}
            <span className="ml-auto">
              Total de execuções:{' '}
              <span className="font-medium text-foreground">
                {formatNumber(data.reduce((sum, entry) => sum + entry.totalExecutions, 0))}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
