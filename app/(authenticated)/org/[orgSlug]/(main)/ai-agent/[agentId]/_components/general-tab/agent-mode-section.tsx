'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { TrendingUp, CalendarCheck, AlertTriangle, Layers } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { cn } from '@/_lib/utils'
import { updateAgentMode } from '@/_actions/agent/update-agent-mode'

interface AgentModeSectionProps {
  agentId: string
  agentMode: 'PRODUCT' | 'SERVICE' | 'HYBRID'
  canManage: boolean
  hasActiveServices: boolean
  stepActionTypes: string[]
}

const OPTIONS = [
  {
    value: 'PRODUCT' as const,
    label: 'Pipeline de Vendas',
    description: 'Agente focado em funil de vendas e negociações.',
    icon: TrendingUp,
  },
  {
    value: 'SERVICE' as const,
    label: 'Agendamento com Profissionais',
    description: 'Agente focado em booking de serviços com profissionais.',
    icon: CalendarCheck,
  },
  {
    value: 'HYBRID' as const,
    label: 'Híbrido',
    description: 'Produtos e serviços combinados.',
    icon: Layers,
  },
]

const TOOL_LABELS: Record<string, string> = {
  list_availability: 'Consultar Disponibilidade',
  create_event: 'Criar Evento',
  create_appointment: 'Agendar Serviço',
}

const PRODUCT_ONLY_TOOLS = new Set(['create_event'])
const SERVICE_ONLY_TOOLS = new Set(['create_appointment'])

export const AgentModeSection = ({
  agentId,
  agentMode,
  canManage,
  hasActiveServices,
  stepActionTypes,
}: AgentModeSectionProps) => {
  const [currentMode, setCurrentMode] = useState(agentMode)
  const [pendingMode, setPendingMode] = useState<'PRODUCT' | 'SERVICE' | 'HYBRID' | null>(null)

  const { execute, isPending } = useAction(updateAgentMode, {
    onSuccess: () => {
      toast.success('Modo do agente atualizado!')
    },
    onError: ({ error }) => {
      setCurrentMode(agentMode)
      toast.error(error.serverError || 'Falha ao atualizar modo. Tente novamente.')
    },
  })

  const getConflictingTools = (targetMode: 'PRODUCT' | 'SERVICE' | 'HYBRID'): string[] => {
    if (targetMode === 'HYBRID') return []
    const incompatible = targetMode === 'SERVICE' ? PRODUCT_ONLY_TOOLS : SERVICE_ONLY_TOOLS
    return [...new Set(stepActionTypes.filter((type) => incompatible.has(type)))]
  }

  const applyModeChange = (value: 'PRODUCT' | 'SERVICE' | 'HYBRID') => {
    setCurrentMode(value)
    setPendingMode(null)
    execute({ agentId, agentMode: value })
  }

  const handleChange = (value: 'PRODUCT' | 'SERVICE' | 'HYBRID') => {
    const conflicts = getConflictingTools(value)
    if (conflicts.length > 0) {
      setPendingMode(value)
      return
    }
    applyModeChange(value)
  }

  const conflictingToolsForPending = pendingMode ? getConflictingTools(pendingMode) : []
  const pendingModeLabel = OPTIONS.find((o) => o.value === pendingMode)?.label ?? ''

  return (
    <>
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
            onValueChange={(value) => handleChange(value as 'PRODUCT' | 'SERVICE' | 'HYBRID')}
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

          {currentMode === 'SERVICE' && !hasActiveServices && (
            <Alert variant="warning" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você ainda não tem serviços cadastrados. Cadastre em{' '}
                <strong>Settings → Serviços</strong> para que este agente funcione corretamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingMode !== null} onOpenChange={(open) => { if (!open) setPendingMode(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mudar para {pendingModeLabel}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  As seguintes ferramentas configuradas nos seus steps não estão disponíveis neste modo
                  e ficarão inativas:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {conflictingToolsForPending.map((type) => (
                    <li key={type} className="text-sm font-medium">
                      {TOOL_LABELS[type] ?? type}
                    </li>
                  ))}
                </ul>
                <p className="text-sm">
                  As configurações são mantidas — você pode voltar ao modo anterior sem perder nada.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingMode && applyModeChange(pendingMode)}>
              Confirmar mudança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
