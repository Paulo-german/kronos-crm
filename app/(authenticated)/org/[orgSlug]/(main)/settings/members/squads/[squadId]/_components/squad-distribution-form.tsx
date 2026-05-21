'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { BarChart2, ListOrdered, RotateCcw } from 'lucide-react'
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
import { updateSquad } from '@/_actions/squad/update-squad'
import { SquadDistributionPreview } from './squad-distribution-preview'
import type { SalesDistributionModel } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'

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
]

interface SquadDistributionFormProps {
  squad: { id: string; distributionModel: SalesDistributionModel }
  canManage: boolean
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
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
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

        <SquadDistributionPreview model={selected} />
      </CardContent>
    </Card>
  )
}
