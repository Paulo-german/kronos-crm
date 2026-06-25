'use client'

import { Users } from 'lucide-react'
import type { AttendantPerformance } from '@/_data-access/dashboard'
import { formatDurationMs } from '@/_utils/format-duration-ms'
import { cn } from '@/_lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { InfoTooltip } from '@/_components/ui/info-tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'

interface InboxAttendantChartProps {
  data: AttendantPerformance[]
}

function getInitials(name: string): string {
  return (
    Array.from(name.trim())
      .join('')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => Array.from(part)[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}

// Cor da posição no ranking: ouro/prata/bronze para o pódio, neutro depois.
function rankClass(position: number): string {
  if (position === 1)
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
  if (position === 2)
    return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  if (position === 3)
    return 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
  return 'bg-muted text-muted-foreground'
}

export function InboxAttendantChart({ data }: InboxAttendantChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Users className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum atendente com conversas no período
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Atendente</TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center justify-end gap-1">
              Conversas
              <InfoTooltip>
                Número de conversas atribuídas a este atendente no período.
              </InfoTooltip>
            </span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center justify-end gap-1">
              Tempo 1ª resposta
              <InfoTooltip>
                Tempo médio que este atendente levou para dar a primeira
                resposta nas conversas dele. Quanto menor, melhor.
              </InfoTooltip>
            </span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center justify-end gap-1">
              Resolvidas
              <InfoTooltip>
                Percentual das conversas deste atendente que foram concluídas
                (marcadas como resolvidas).
              </InfoTooltip>
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((attendant, index) => {
          const position = index + 1
          return (
            <TableRow key={attendant.userId}>
              <TableCell>
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    rankClass(position),
                  )}
                >
                  {position}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarImage
                      src={attendant.userAvatar ?? undefined}
                      alt={attendant.userName}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(attendant.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{attendant.userName}</span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {attendant.conversationsHandled}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {attendant.avgFirstResponseTimeMs != null
                  ? formatDurationMs(attendant.avgFirstResponseTimeMs)
                  : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {attendant.resolutionRate}%
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
