'use client'

import { ArrowRight, BarChart2, TrendingUp } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Badge } from '@/_components/ui/badge'
import type { SalesDistributionModel } from '@prisma/client'

interface SquadDistributionPreviewProps {
  model: SalesDistributionModel
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

const MEMBERS = [
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

function RoundRobinPreview() {
  const lastIndex = 2

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <span>Novo lead</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">próximo na fila</Chip>
      </div>

      <div className="flex items-center gap-2">
        {MEMBERS.map((member, index) => {
          const isNext = index === (lastIndex + 1) % 4
          const isLast = index === lastIndex

          return (
            <div key={member.name} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-semibold',
                  isNext ? 'text-primary' : 'text-muted-foreground/50',
                )}
              >
                {index + 1}
              </span>
              <Avatar initial={member.initial} color={member.color} active={isNext} size="md" />
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
        <Avatar initial={MEMBERS[lastIndex].initial} color={MEMBERS[lastIndex].color} size="sm" />
        <span className="font-medium">{MEMBERS[lastIndex].name}</span>
        <ArrowRight className="h-3 w-3" />
        <Avatar initial={MEMBERS[(lastIndex + 1) % 4].initial} color={MEMBERS[(lastIndex + 1) % 4].color} active size="sm" />
        <span className="font-medium text-primary">{MEMBERS[(lastIndex + 1) % 4].name}</span>
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
        <Chip variant="primary">responsável de sempre</Chip>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              J
            </div>
            <span className="text-xs text-muted-foreground">João</span>
          </div>

          <div className="flex flex-1 flex-col items-center gap-0.5 px-3">
            <div className="h-px w-full border-t border-dashed border-primary/50" />
            <span className="text-[10px] text-muted-foreground">3 interações anteriores</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Avatar initial="A" color="bg-violet-500" active size="md" />
            <span className="text-xs font-medium text-primary">Ana</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
          <span className="text-[11px] text-muted-foreground">Se Ana indisponível:</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Chip variant="muted">round robin</Chip>
        </div>
      </div>
    </div>
  )
}

function UtilizationPreview() {
  const loads = [28, 72, 51, 65]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <BarChart2 className="h-3 w-3" />
        <span>Novo lead</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">menor carga de negócios</Chip>
      </div>

      <div className="flex items-end justify-center gap-5">
        {MEMBERS.map((member, index) => {
          const load = loads[index]
          const isWinner = load === Math.min(...loads)

          return (
            <div key={member.name} className="flex flex-col items-center gap-2">
              {isWinner ? (
                <Chip variant="primary">{load}%</Chip>
              ) : (
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

              <Avatar initial={member.initial} color={member.color} active={isWinner} size="md" />
              <span className={cn('text-xs', isWinner ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                {member.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ManualPreview() {
  const ordered = [
    { ...MEMBERS[0], priority: '1ª prioridade' },
    { ...MEMBERS[2], priority: '2ª prioridade' },
    { ...MEMBERS[1], priority: '3ª prioridade' },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Atribuição</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">definida manualmente</Chip>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {ordered.map((member, index) => (
          <div
            key={member.name}
            className={cn(
              'flex items-center gap-3 rounded-md border px-3 py-2',
              index === 0 ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20',
            )}
          >
            <span className={cn('text-xs font-bold tabular-nums', index === 0 ? 'text-primary' : 'text-muted-foreground')}>
              {index + 1}
            </span>
            <Avatar initial={member.initial} color={member.color} active={index === 0} size="sm" />
            <span className={cn('flex-1 text-xs font-medium', index === 0 ? 'text-foreground' : 'text-muted-foreground')}>
              {member.name}
            </span>
            <span className={cn('text-[10px]', index === 0 ? 'text-primary' : 'text-muted-foreground/50')}>
              {member.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PerformanceWeightedPreview() {
  const scores = [92, 67, 81, 45]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3" />
        <span>Novo lead</span>
        <ArrowRight className="h-3 w-3" />
        <Chip variant="primary">maior score de performance</Chip>
      </div>

      <div className="flex items-end justify-center gap-5">
        {MEMBERS.map((member, index) => {
          const score = scores[index]
          const isWinner = score === Math.max(...scores)

          return (
            <div key={member.name} className="flex flex-col items-center gap-2">
              {isWinner ? (
                <Chip variant="primary">{score}</Chip>
              ) : (
                <span className="text-xs text-muted-foreground">{score}</span>
              )}

              <div className="relative flex h-16 w-8 flex-col-reverse overflow-hidden rounded-sm bg-muted/50">
                <div
                  className={cn(
                    'w-full rounded-sm transition-all duration-500',
                    isWinner ? 'bg-primary' : 'bg-muted-foreground/25',
                  )}
                  style={{ height: `${score}%` }}
                />
              </div>

              <Avatar initial={member.initial} color={member.color} active={isWinner} size="md" />
              <span className={cn('text-xs', isWinner ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                {member.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PREVIEW_MAP: Record<SalesDistributionModel, React.ComponentType> = {
  ROUND_ROBIN: RoundRobinPreview,
  LOYALTY: LoyaltyPreview,
  UTILIZATION: UtilizationPreview,
  MANUAL: ManualPreview,
  PERFORMANCE_WEIGHTED: PerformanceWeightedPreview,
}

const PREVIEW_TITLES: Record<SalesDistributionModel, string> = {
  ROUND_ROBIN: 'Round Robin',
  LOYALTY: 'Fidelidade',
  UTILIZATION: 'Maior disponibilidade',
  MANUAL: 'Manual',
  PERFORMANCE_WEIGHTED: 'Por Performance',
}

export function SquadDistributionPreview({ model }: SquadDistributionPreviewProps) {
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
