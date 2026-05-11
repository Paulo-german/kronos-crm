'use client'

import { Fragment } from 'react'
import { cn } from '@/_lib/utils'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import type { DistributionModel } from '@prisma/client'
import { Badge } from '@/_components/ui/badge'

interface DistributionModelPreviewProps {
  model: DistributionModel
}

interface AvatarProps {
  initial: string
  color: string
  active?: boolean
  size?: 'sm' | 'md'
}

interface ChipProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'muted'
}

const PROS = [
  { initial: 'A', name: 'Ana', color: 'bg-violet-500' },
  { initial: 'B', name: 'Bruno', color: 'bg-blue-500' },
  { initial: 'C', name: 'Carla', color: 'bg-emerald-500' },
  { initial: 'D', name: 'Diego', color: 'bg-amber-500' },
]

function Avatar({ initial, color, active = false, size = 'md' }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold transition-all',
        size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs',
        active
          ? `${color} text-white ring-2 ring-primary ring-offset-2 ring-offset-background`
          : 'bg-muted text-muted-foreground',
      )}
    >
      {initial}
    </div>
  )
}

function Chip({ children, variant = 'default' }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'primary' && 'bg-primary/15 text-primary',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        variant === 'default' &&
          'border border-border bg-muted/60 text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

function UtilizationPreview() {
  const loads = [28, 72, 51, 65]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>Novo agendamento</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">menor carga da semana</Chip>
      </div>

      <div className="flex items-end justify-center gap-5">
        {PROS.map((pro, index) => {
          const load = loads[index]
          const isWinner = load === Math.min(...loads)

          return (
            <div key={pro.name} className="flex flex-col items-center gap-2">
              {isWinner && <Chip variant="primary">{load}%</Chip>}
              {!isWinner && (
                <span className="text-xs text-muted-foreground">{load}%</span>
              )}

              <div className="relative flex h-16 w-8 flex-col-reverse overflow-hidden rounded-sm bg-muted/50">
                <div
                  className={cn(
                    'w-full rounded-sm transition-all duration-500',
                    isWinner ? 'bg-primary' : 'bg-muted-foreground/25',
                  )}
                  style={{ height: `${load}%` }}
                />
              </div>

              <Avatar
                initial={pro.initial}
                color={pro.color}
                active={isWinner}
                size="md"
              />
              <span
                className={cn(
                  'text-xs',
                  isWinner
                    ? 'font-semibold text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {pro.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RoundRobinPreview() {
  const lastIndex = 2

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <span>Rotação sequencial</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">próximo na fila</Chip>
      </div>

      <div className="flex items-center gap-2">
        {PROS.slice(0, 4).map((pro, index) => {
          const isNext = index === (lastIndex + 1) % 4
          const isLast = index === lastIndex

          return (
            <div key={pro.name} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-semibold',
                  isNext ? 'text-primary' : 'text-muted-foreground/50',
                )}
              >
                {index + 1}
              </span>
              <Avatar
                initial={pro.initial}
                color={pro.color}
                active={isNext}
                size="md"
              />
              <span
                className={cn(
                  'text-xs',
                  isNext && 'font-medium text-primary',
                  isLast && 'text-muted-foreground/50',
                )}
              >
                {isNext ? 'próximo' : isLast ? 'último' : ''}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span>Após</span>
        <Avatar
          initial={PROS[lastIndex].initial}
          color={PROS[lastIndex].color}
          size="sm"
        />
        <span className="font-medium">{PROS[lastIndex].name}</span>
        <ArrowRight className="h-3 w-3" />
        <Avatar
          initial={PROS[(lastIndex + 1) % 4].initial}
          color={PROS[(lastIndex + 1) % 4].color}
          active
          size="sm"
        />
        <span className="font-medium text-primary">
          {PROS[(lastIndex + 1) % 4].name}
        </span>
      </div>
    </div>
  )
}

function findFirstFreeSlot(
  schedule: boolean[][],
  timeCount: number,
): { row: number; col: number } | null {
  for (let col = 0; col < timeCount; col++) {
    for (let row = 0; row < schedule.length; row++) {
      if (!schedule[row][col]) return { row, col }
    }
  }
  return null
}

function FirstAvailablePreview() {
  // schedule[pro][slot] = true se ocupado
  const schedule = [
    [true, true, false, true],
    [true, false, true, true],
    [false, true, true, false],
  ]
  const times = ['09:00', '10:00', '11:00', '14:00']

  const firstFree = findFirstFreeSlot(schedule, times.length)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Slot mais cedo disponível é selecionado automaticamente</span>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div
          className="grid"
          style={{ gridTemplateColumns: `5rem repeat(${times.length}, 1fr)` }}
        >
          {/* Header */}
          <div className="border-b border-r border-border bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground" />
          {times.map((time) => (
            <div
              key={time}
              className="border-b border-r border-border bg-muted/40 px-2 py-1.5 text-center text-xs text-muted-foreground last:border-r-0"
            >
              {time}
            </div>
          ))}

          {/* Rows */}
          {PROS.slice(0, 3).map((pro, rowIndex) => (
            <Fragment key={pro.name}>
              <div className="flex items-center gap-1.5 border-b border-r border-border px-2 py-2 last:border-b-0">
                <Avatar initial={pro.initial} color={pro.color} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {pro.name}
                </span>
              </div>
              {times.map((time, colIndex) => {
                const isBusy = schedule[rowIndex][colIndex]
                const isFirstFree =
                  firstFree !== null &&
                  rowIndex === firstFree.row &&
                  colIndex === firstFree.col

                return (
                  <div
                    key={`${pro.name}-${time}`}
                    className={cn(
                      'border-b border-r border-border px-1 py-2 last:border-r-0',
                    )}
                  >
                    <div
                      className={cn(
                        'mx-auto h-6 w-full rounded-sm transition-all',
                        isBusy && 'bg-muted-foreground/20',
                        isFirstFree &&
                          'animate-pulse bg-primary/30 ring-1 ring-primary',
                      )}
                    >
                      {isFirstFree && (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">
                            ✓
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoyaltyPreview() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Cliente reconhecido</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">profissional de sempre</Chip>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {/* Main loyalty flow */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              J
            </div>
            <span className="text-xs text-muted-foreground">João</span>
          </div>

          <div className="flex flex-1 flex-col items-center gap-0.5 px-3">
            <div className="h-px w-full border-t border-dashed border-primary/50" />
            <span className="text-[10px] text-muted-foreground">
              3 visitas anteriores
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Avatar initial="A" color="bg-violet-500" active size="md" />
            <span className="text-xs font-medium text-primary">Ana</span>
          </div>
        </div>

        {/* Fallback */}
        <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
          <span className="text-[11px] text-muted-foreground">
            Se Ana indisponível:
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Chip variant="muted">fallback configurado</Chip>
        </div>
      </div>
    </div>
  )
}

function ManualPreview() {
  const ordered = [
    { ...PROS[0], priority: '1ª prioridade' },
    { ...PROS[2], priority: '2ª prioridade' },
    { ...PROS[1], priority: '3ª prioridade' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Ordem definida por você</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">arrastar para reordenar</Chip>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {ordered.map((pro, index) => (
          <div
            key={pro.name}
            className={cn(
              'flex items-center gap-3 rounded-md border px-3 py-2',
              index === 0
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-muted/20',
            )}
          >
            <span
              className={cn(
                'text-xs font-bold tabular-nums',
                index === 0 ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {index + 1}
            </span>
            <Avatar
              initial={pro.initial}
              color={pro.color}
              active={index === 0}
              size="sm"
            />
            <span
              className={cn(
                'flex-1 text-xs font-medium',
                index === 0 ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {pro.name}
            </span>
            <span
              className={cn(
                'text-[10px]',
                index === 0 ? 'text-primary' : 'text-muted-foreground/50',
              )}
            >
              {pro.priority}
            </span>
            <div className="flex flex-col gap-0.5 opacity-40">
              <div className="h-px w-3 bg-muted-foreground" />
              <div className="h-px w-3 bg-muted-foreground" />
              <div className="h-px w-3 bg-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const PREVIEW_MAP: Record<DistributionModel, React.ComponentType> = {
  UTILIZATION: UtilizationPreview,
  ROUND_ROBIN: RoundRobinPreview,
  FIRST_AVAILABLE: FirstAvailablePreview,
  LOYALTY: LoyaltyPreview,
  MANUAL: ManualPreview,
}

const PREVIEW_TITLES: Record<DistributionModel, string> = {
  UTILIZATION: 'Maior disponibilidade',
  ROUND_ROBIN: 'Rotação sequencial',
  FIRST_AVAILABLE: 'Primeiro disponível',
  LOYALTY: 'Fidelização',
  MANUAL: 'Ordem manual',
}

export function DistributionModelPreview({
  model,
}: DistributionModelPreviewProps) {
  const Preview = PREVIEW_MAP[model]

  return (
    <div className="rounded-lg border border-border bg-input p-4">
      <p className="mb-4 text-xs font-medium tracking-wider text-foreground">
        COMO FUNCIONA: <Badge>{PREVIEW_TITLES[model]}</Badge>
      </p>

      <Preview />
    </div>
  )
}
