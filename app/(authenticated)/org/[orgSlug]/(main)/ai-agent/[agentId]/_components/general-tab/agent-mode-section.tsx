'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { TrendingUp, CalendarCheck } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { cn } from '@/_lib/utils'
import { updateAgentMode } from '@/_actions/agent/update-agent-mode'

interface AgentModeSectionProps {
  agentId: string
  agentMode: 'PIPELINE' | 'BOOKING'
  canManage: boolean
}

const OPTIONS = [
  {
    value: 'PIPELINE' as const,
    label: 'Pipeline de Vendas',
    description: 'Agente focado em funil de vendas e negociações.',
    icon: TrendingUp,
  },
  {
    value: 'BOOKING' as const,
    label: 'Agendamento com Profissionais',
    description: 'Agente focado em booking de serviços com profissionais.',
    icon: CalendarCheck,
  },
]

export const AgentModeSection = ({
  agentId,
  agentMode,
  canManage,
}: AgentModeSectionProps) => {
  const [currentMode, setCurrentMode] = useState(agentMode)

  const { execute, isPending } = useAction(updateAgentMode, {
    onSuccess: () => {
      toast.success('Modo do agente atualizado!')
    },
    onError: ({ error }) => {
      setCurrentMode(agentMode)
      toast.error(error.serverError || 'Falha ao atualizar modo. Tente novamente.')
    },
  })

  const handleChange = (value: 'PIPELINE' | 'BOOKING') => {
    setCurrentMode(value)
    execute({ agentId, agentMode: value })
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Modo de Operação</CardTitle>
        <CardDescription>
          Define o comportamento principal do agente e as ferramentas disponíveis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={currentMode}
          onValueChange={(value) => handleChange(value as 'PIPELINE' | 'BOOKING')}
          disabled={!canManage || isPending}
          className="space-y-3"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = currentMode === option.value

            return (
              <Label
                key={option.value}
                htmlFor={`agent-mode-${option.value}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 hover:border-border hover:bg-muted/30',
                  (!canManage || isPending) && 'cursor-not-allowed opacity-60',
                )}
              >
                <RadioGroupItem
                  id={`agent-mode-${option.value}`}
                  value={option.value}
                  className="mt-0.5 shrink-0"
                />
                <Icon
                  className={cn(
                    'mt-0.5 h-5 w-5 shrink-0',
                    isSelected ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-none">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </Label>
            )
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
