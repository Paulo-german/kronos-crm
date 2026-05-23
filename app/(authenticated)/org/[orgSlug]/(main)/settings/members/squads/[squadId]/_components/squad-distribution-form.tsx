'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { BarChart2, ListOrdered, RotateCcw, Scale } from 'lucide-react'
import { cn } from '@/_lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { Slider } from '@/_components/ui/slider'
import { updateSquad } from '@/_actions/squad/update-squad'
import { updateSquadMember } from '@/_actions/squad/update-squad-member'
import { SquadDistributionPreview } from './squad-distribution-preview'
import type { SalesDistributionModel } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'
import type { SquadMemberDto } from '@/_data-access/squad/get-squad-by-id'

const MIN_WEIGHT = 0
const MAX_WEIGHT = 100
const WEIGHT_STEP = 5

const MEMBER_PALETTE = [
  { bg: 'bg-violet-500', text: 'text-violet-500' },
  { bg: 'bg-blue-500', text: 'text-blue-500' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500' },
  { bg: 'bg-amber-500', text: 'text-amber-500' },
  { bg: 'bg-rose-500', text: 'text-rose-500' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500' },
  { bg: 'bg-orange-500', text: 'text-orange-500' },
  { bg: 'bg-indigo-500', text: 'text-indigo-500' },
]

interface ModelOption {
  value: SalesDistributionModel
  label: string
  description: string
  icon: LucideIcon
}

const DISTRIBUTION_OPTIONS: ModelOption[] = [
  {
    value: 'ROUND_ROBIN',
    label: 'Round Robin',
    description: 'Distribui leads em rotação sequencial entre os membros.',
    icon: RotateCcw,
  },
  {
    value: 'UTILIZATION',
    label: 'Maior disponibilidade',
    description: 'Distribui para quem tem menos negócios em aberto.',
    icon: BarChart2,
  },
  {
    value: 'MANUAL',
    label: 'Manual',
    description: 'Sem distribuição automática — atribuição manual pelo time.',
    icon: ListOrdered,
  },
  {
    value: 'WEIGHTED',
    label: 'Round Robin Ponderado',
    description: 'Distribui proporcionalmente ao peso de cada membro.',
    icon: Scale,
  },
]

interface SquadDistributionFormProps {
  squad: {
    id: string
    distributionModel: SalesDistributionModel
    members: SquadMemberDto[]
  }
  canManage: boolean
}

interface WeightedMembersEditorProps {
  members: SquadMemberDto[]
  canManage: boolean
}

function getInitials(fullName: string | null | undefined, email: string): string {
  if (fullName) {
    return fullName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function snapWeight(value: number): number {
  if (value === 0) return 0
  return Math.max(WEIGHT_STEP, Math.round(value / WEIGHT_STEP) * WEIGHT_STEP)
}

function WeightedMembersEditor({ members, canManage }: WeightedMembersEditorProps) {
  const activeMembers = members.filter((squadMember) => squadMember.isActive)

  const initialWeights = Object.fromEntries(
    activeMembers.map((squadMember) => [squadMember.id, snapWeight(squadMember.weight)]),
  )

  const [weights, setWeights] = useState<Record<string, number>>(initialWeights)
  const [savedWeights, setSavedWeights] = useState<Record<string, number>>(initialWeights)

  const { execute } = useAction(updateSquadMember, {
    onSuccess: ({ input }) => {
      if (input.weight !== undefined) {
        setSavedWeights((prev) => ({ ...prev, [input.squadMemberId]: input.weight! }))
      }
      toast.success('Peso atualizado.')
    },
    onError: ({ error, input }) => {
      if (input?.weight !== undefined) {
        setWeights((prev) => ({ ...prev, [input.squadMemberId]: savedWeights[input.squadMemberId] ?? MIN_WEIGHT }))
      }
      toast.error(error.serverError ?? 'Erro ao salvar o peso.')
    },
  })

  const total = activeMembers.reduce(
    (sum, squadMember) => sum + (weights[squadMember.id] ?? MIN_WEIGHT),
    0,
  )

  const handleSliderChange = (squadMemberId: string, value: number[]) => {
    setWeights((prev) => ({ ...prev, [squadMemberId]: snapWeight(value[0]) }))
  }

  const handleSliderCommit = (squadMemberId: string, value: number[]) => {
    const next = snapWeight(value[0])
    if (next === savedWeights[squadMemberId]) return
    execute({ squadMemberId, weight: next })
  }

  if (activeMembers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Adicione membros ao squad para configurar pesos.
      </p>
    )
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-muted/20 p-4">
      {/* Barra empilhada */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Distribuição total</p>
        <div className="flex h-5 w-full overflow-hidden rounded-full">
          {activeMembers.map((squadMember, index) => {
            const weight = weights[squadMember.id] ?? MIN_WEIGHT
            const pct = total > 0 ? (weight / total) * 100 : 0
            const color = MEMBER_PALETTE[index % MEMBER_PALETTE.length]

            return (
              <div
                key={squadMember.id}
                className={cn('transition-[width] duration-300', color.bg)}
                style={{ width: `${pct}%` }}
              />
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {activeMembers.map((squadMember, index) => {
            const weight = weights[squadMember.id] ?? MIN_WEIGHT
            const pct = total > 0 ? (weight / total) * 100 : 0
            const firstName = (squadMember.member.user?.fullName ?? squadMember.member.email).split(' ')[0]
            const color = MEMBER_PALETTE[index % MEMBER_PALETTE.length]

            return (
              <div key={squadMember.id} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', color.bg)} />
                <span className="text-xs text-muted-foreground">{firstName}</span>
                <span className={cn('text-xs font-semibold', color.text)}>{pct.toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sliders por membro */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground">Pesos individuais</p>
        {activeMembers.map((squadMember, index) => {
          const weight = weights[squadMember.id] ?? MIN_WEIGHT
          const pct = total > 0 ? (weight / total) * 100 : 0
          const displayName = squadMember.member.user?.fullName ?? squadMember.member.email
          const initials = getInitials(squadMember.member.user?.fullName, squadMember.member.email)
          const color = MEMBER_PALETTE[index % MEMBER_PALETTE.length]

          return (
            <div key={squadMember.id} className="flex items-center gap-3">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white', color.bg)}>
                {initials}
              </div>
              <span className="w-24 shrink-0 truncate text-sm font-medium">{displayName}</span>
              <Slider
                min={MIN_WEIGHT}
                max={MAX_WEIGHT}
                step={WEIGHT_STEP}
                value={[weight]}
                disabled={!canManage}
                className="flex-1"
                onValueChange={(value) => handleSliderChange(squadMember.id, value)}
                onValueCommit={(value) => handleSliderCommit(squadMember.id, value)}
              />
              <span className={cn('w-12 shrink-0 text-right text-sm font-semibold tabular-nums', color.text)}>
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SquadDistributionForm({ squad, canManage }: SquadDistributionFormProps) {
  const [selected, setSelected] = useState<SalesDistributionModel>(squad.distributionModel)

  const { execute, isPending } = useAction(updateSquad, {
    onSuccess: () => toast.success('Modelo de distribuição atualizado!'),
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar.')
      setSelected(squad.distributionModel)
    },
  })

  const handleChange = (value: string) => {
    const model = value as SalesDistributionModel
    setSelected(model)
    execute({ id: squad.id, distributionModel: model })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Modelo de distribuição</CardTitle>
        <CardDescription>
          Define como novos leads são atribuídos automaticamente aos membros do time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selected}
          onValueChange={handleChange}
          disabled={!canManage || isPending}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {DISTRIBUTION_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = selected === option.value

            return (
              <Label
                key={option.value}
                htmlFor={`squad-distribution-${option.value}`}
                className={cn(
                  'flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-all',
                  !canManage && 'cursor-not-allowed opacity-60',
                  canManage && !isPending && 'hover:border-primary/40 hover:bg-primary/5',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card',
                )}
              >
                <RadioGroupItem
                  id={`squad-distribution-${option.value}`}
                  value={option.value}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className={cn('text-sm font-semibold', isSelected && 'text-primary')}>
                    {option.label}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </Label>
            )
          })}
        </RadioGroup>

        {selected === 'WEIGHTED' && (
          <WeightedMembersEditor members={squad.members} canManage={canManage} />
        )}

        <SquadDistributionPreview model={selected} />
      </CardContent>
    </Card>
  )
}
