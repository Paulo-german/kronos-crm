'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Textarea } from '@/_components/ui/textarea'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Skeleton } from '@/_components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import { triggerAgentGeneration } from '@/_actions/onboarding/trigger-agent-generation'
import { seedOrganization } from '@/_actions/onboarding/seed-organization'
import { useTaskPolling } from '../_hooks/use-task-polling'
import { GenerationLoadingCard } from './generation-loading-card'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { ConfigBundle } from '@/_lib/onboarding/schemas/config-bundle'
import type { AgentStepsOutput } from '@/_lib/onboarding/schemas/agent-output'

const LS_PROMPT_TASK_ID = 'kronos_onb_prompt_task_id'
const LS_STEPS_TASK_ID = 'kronos_onb_steps_task_id'
const LS_SYSTEM_PROMPT = 'kronos_onb_system_prompt'
const LS_AGENT_STEPS = 'kronos_onb_agent_steps'

type AgentStepBlueprint = AgentStepsOutput['steps'][number]
type BlueprintAction = AgentStepBlueprint['actions'][number]

// Mapeamento de cor para cada tipo de action
const ACTION_TYPE_COLORS: Record<BlueprintAction['type'], string> = {
  move_deal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  create_task: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update_deal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  search_knowledge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hand_off_to_human: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  list_availability: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  create_event: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  update_contact: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

const ACTION_TYPE_LABELS: Record<BlueprintAction['type'], string> = {
  move_deal: 'Mover negócio',
  create_task: 'Criar tarefa',
  update_deal: 'Atualizar negócio',
  search_knowledge: 'Buscar base',
  hand_off_to_human: 'Transferir humano',
  list_availability: 'Listar agenda',
  create_event: 'Criar evento',
  update_contact: 'Atualizar contato',
}

// Renderiza os detalhes de cada action de forma legível
function ActionDetail({ action }: { action: BlueprintAction }) {
  const details: string[] = []

  switch (action.type) {
    case 'move_deal':
      details.push(`Move para stage posição ${action.targetStagePosition}`)
      break
    case 'update_deal':
      if (action.allowedFields && action.allowedFields.length > 0) {
        const fieldLabels: Record<string, string> = {
          title: 'título',
          value: 'valor',
          priority: 'prioridade',
          expectedCloseDate: 'previsão de fechamento',
          notes: 'notas',
        }
        details.push(
          `Campos: ${action.allowedFields.map((field) => fieldLabels[field] || field).join(', ')}`,
        )
      }
      if (action.fixedPriority) {
        details.push(`Prioridade fixa: ${action.fixedPriority}`)
      }
      if (action.allowedStatuses && action.allowedStatuses.length > 0) {
        details.push(`Status permitidos: ${action.allowedStatuses.join(', ')}`)
      }
      break
    case 'create_task':
      details.push(`Tarefa: "${action.title}"`)
      if (action.dueDaysOffset) {
        details.push(`Vencimento: ${action.dueDaysOffset} dias`)
      }
      break
    case 'list_availability':
      if (action.daysAhead) details.push(`${action.daysAhead} dias à frente`)
      if (action.slotDuration) details.push(`Slots de ${action.slotDuration}min`)
      if (action.startTime && action.endTime)
        details.push(`${action.startTime}–${action.endTime}`)
      break
    case 'create_event':
      if (action.titleInstructions) details.push(`"${action.titleInstructions}"`)
      if (action.duration) details.push(`${action.duration}min`)
      if (action.startTime && action.endTime)
        details.push(`${action.startTime}–${action.endTime}`)
      if (action.allowReschedule) details.push('Reagendamento permitido')
      break
    case 'hand_off_to_human':
      if (action.notifyTarget === 'deal_assignee') {
        details.push('Notifica responsável do negócio')
      } else if (action.notifyTarget === 'specific_number') {
        details.push('Notifica número específico')
      }
      if (action.notificationMessage) {
        details.push(`Msg: "${action.notificationMessage}"`)
      }
      break
    case 'search_knowledge':
    case 'update_contact':
      break
  }

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={`shrink-0 text-[10px] ${ACTION_TYPE_COLORS[action.type]}`}
        >
          {ACTION_TYPE_LABELS[action.type]}
        </Badge>
        <span className="text-xs text-muted-foreground truncate">
          {action.trigger}
        </span>
      </div>
      {details.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
          {details.map((detail, detailIndex) => (
            <span key={detailIndex} className="text-[11px] text-muted-foreground/80">
              {detail}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

interface StepCardProps {
  step: AgentStepBlueprint
  onNameChange: (name: string) => void
  onKeyQuestionChange: (value: string | null) => void
  onMessageTemplateChange: (value: string | null) => void
}

function StepCard({
  step,
  onNameChange,
  onKeyQuestionChange,
  onMessageTemplateChange,
}: StepCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {step.order + 1}
            </span>
            <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="truncate text-sm font-semibold">{step.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {step.objective}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1">
              {step.actions.slice(0, 2).map((action, actionIndex) => (
                <Badge
                  key={actionIndex}
                  variant="secondary"
                  className={`text-[10px] ${ACTION_TYPE_COLORS[action.type]}`}
                >
                  {ACTION_TYPE_LABELS[action.type]}
                </Badge>
              ))}
              {step.actions.length > 2 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{step.actions.length - 2}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 border-t px-4 py-3">
            {/* Nome editavel */}
            <div className="space-y-1">
              <Label className="text-xs">Nome da etapa</Label>
              <Input
                value={step.name}
                onChange={(event) => onNameChange(event.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Pergunta-chave */}
            <div className="space-y-1">
              <Label className="text-xs">Pergunta-chave</Label>
              <Textarea
                value={step.keyQuestion ?? ''}
                onChange={(event) =>
                  onKeyQuestionChange(event.target.value || null)
                }
                placeholder="Pergunta que o agente deve fazer nesta etapa..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Template de mensagem */}
            <div className="space-y-1">
              <Label className="text-xs">Template de mensagem</Label>
              <Textarea
                value={step.messageTemplate ?? ''}
                onChange={(event) =>
                  onMessageTemplateChange(event.target.value || null)
                }
                placeholder="Mensagem padrão para esta etapa..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Actions (read-only com detalhes) */}
            <div className="space-y-2">
              <Label className="text-xs">Ações automáticas</Label>
              <div className="flex flex-col gap-2">
                {step.actions.map((action, actionIndex) => (
                  <ActionDetail key={actionIndex} action={action} />
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

interface AgentReviewStepProps {
  businessProfile: BusinessProfile
  configBundle: ConfigBundle
  initialSystemPrompt: string | null
  initialAgentSteps: AgentStepBlueprint[] | null
  onComplete: () => void
  onBack: () => void
}

export function AgentReviewStep({
  businessProfile,
  configBundle,
  initialSystemPrompt,
  initialAgentSteps,
  onComplete,
  onBack,
}: AgentReviewStepProps) {
  const [systemPrompt, setSystemPrompt] = useState<string | null>(
    initialSystemPrompt,
  )
  const [agentSteps, setAgentSteps] = useState<AgentStepBlueprint[] | null>(
    initialAgentSteps,
  )
  const [promptError, setPromptError] = useState<string | null>(null)
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [isPromptOpen, setIsPromptOpen] = useState(true)

  const promptPolling = useTaskPolling()
  const stepsPolling = useTaskPolling()

  const { execute: executeTrigger, isPending: isTriggeringGeneration } = useAction(
    triggerAgentGeneration,
    {
      onSuccess: ({ data }) => {
        if (!data) return
        localStorage.setItem(LS_PROMPT_TASK_ID, data.promptTaskId)
        localStorage.setItem(LS_STEPS_TASK_ID, data.stepsTaskId)
        promptPolling.startPolling(data.promptTaskId)
        stepsPolling.startPolling(data.stepsTaskId)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao iniciar geração do agente.')
        setPromptError(error.serverError ?? 'Erro ao iniciar geração.')
        setStepsError(error.serverError ?? 'Erro ao iniciar geração.')
      },
    },
  )

  const { execute: executeSeed, isPending: isSeeding } = useAction(
    seedOrganization,
    {
      onSuccess: () => {
        toast.success('Configuração aplicada com sucesso!')
        // Limpar localStorage de dados transientes do onboarding
        localStorage.removeItem(LS_PROMPT_TASK_ID)
        localStorage.removeItem(LS_STEPS_TASK_ID)
        localStorage.removeItem(LS_SYSTEM_PROMPT)
        localStorage.removeItem(LS_AGENT_STEPS)
        onComplete()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao aplicar configuração. Tente novamente.')
      },
    },
  )

  const hasTriggeredRef = useRef(false)

  // Na montagem: verificar se ja tem dados ou disparar geracao
  useEffect(() => {
    if (hasTriggeredRef.current) return

    if (initialSystemPrompt && initialAgentSteps) {
      hasTriggeredRef.current = true
      return
    }

    const savedPrompt = localStorage.getItem(LS_SYSTEM_PROMPT)
    const savedSteps = localStorage.getItem(LS_AGENT_STEPS)

    if (savedPrompt && savedSteps) {
      try {
        const parsedSteps = JSON.parse(savedSteps) as AgentStepBlueprint[]
        setSystemPrompt(savedPrompt)
        setAgentSteps(parsedSteps)
        hasTriggeredRef.current = true
        return
      } catch {
        // Dados invalidos, disparar nova geracao
      }
    }

    const savedPromptTaskId = localStorage.getItem(LS_PROMPT_TASK_ID)
    const savedStepsTaskId = localStorage.getItem(LS_STEPS_TASK_ID)

    if (savedPromptTaskId && savedStepsTaskId) {
      hasTriggeredRef.current = true
      promptPolling.startPolling(savedPromptTaskId)
      stepsPolling.startPolling(savedStepsTaskId)
      return
    }

    hasTriggeredRef.current = true
    executeTrigger({ businessProfile, configBundle })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reagir ao resultado do polling de prompt
  useEffect(() => {
    if (promptPolling.status === 'COMPLETED' && promptPolling.output) {
      const result = promptPolling.output as { systemPrompt: string }
      setSystemPrompt(result.systemPrompt)
      localStorage.setItem(LS_SYSTEM_PROMPT, result.systemPrompt)
      localStorage.removeItem(LS_PROMPT_TASK_ID)
    }
    if (promptPolling.error) {
      setPromptError(promptPolling.error)
      localStorage.removeItem(LS_PROMPT_TASK_ID)
      toast.error(`Falha na geração do prompt: ${promptPolling.error}`)
    }
  }, [promptPolling.status, promptPolling.output, promptPolling.error])

  // Reagir ao resultado do polling de steps
  useEffect(() => {
    if (stepsPolling.status === 'COMPLETED' && stepsPolling.output) {
      const result = stepsPolling.output as AgentStepsOutput
      setAgentSteps(result.steps)
      localStorage.setItem(LS_AGENT_STEPS, JSON.stringify(result.steps))
      localStorage.removeItem(LS_STEPS_TASK_ID)
    }
    if (stepsPolling.error) {
      setStepsError(stepsPolling.error)
      localStorage.removeItem(LS_STEPS_TASK_ID)
      toast.error(`Falha na geração das etapas: ${stepsPolling.error}`)
    }
  }, [stepsPolling.status, stepsPolling.output, stepsPolling.error])

  const handleRegeneratePrompt = useCallback(() => {
    setSystemPrompt(null)
    setPromptError(null)
    localStorage.removeItem(LS_SYSTEM_PROMPT)
    executeTrigger({ businessProfile, configBundle })
  }, [businessProfile, configBundle, executeTrigger])

  const handleRegenerateSteps = useCallback(() => {
    setAgentSteps(null)
    setStepsError(null)
    localStorage.removeItem(LS_AGENT_STEPS)
    executeTrigger({ businessProfile, configBundle })
  }, [businessProfile, configBundle, executeTrigger])

  const handleConfirm = useCallback(() => {
    if (!systemPrompt || !agentSteps) return

    const savedBusinessProfile = localStorage.getItem('kronos_onb_business_profile')
    const profile = savedBusinessProfile
      ? (JSON.parse(savedBusinessProfile) as BusinessProfile)
      : businessProfile

    executeSeed({
      generatedBlueprint: {
        configBundle,
        systemPrompt,
        agentSteps,
        companyName: profile.companyName,
        companyDescription: profile.companyDescription,
        agentName: profile.agentName ?? `Agente ${profile.companyName}`,
      },
    })
  }, [systemPrompt, agentSteps, configBundle, businessProfile, executeSeed])

  const updateStep = useCallback(
    (
      order: number,
      field: keyof AgentStepBlueprint,
      value: string | null,
    ) => {
      setAgentSteps((prev) =>
        prev
          ? prev.map((step) =>
              step.order === order ? { ...step, [field]: value } : step,
            )
          : prev,
      )
    },
    [],
  )

  const isGeneratingPrompt = promptPolling.isPolling || isTriggeringGeneration
  const isGeneratingSteps = stepsPolling.isPolling || isTriggeringGeneration
  const isGenerating = isGeneratingPrompt || isGeneratingSteps
  const bothReady = !!systemPrompt && !!agentSteps && !isGenerating

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Revise o prompt e as etapas de atendimento do seu agente IA.
        </p>
      </div>

      {/* Secao 1: System Prompt */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Prompt do Sistema</CardTitle>
              <CardDescription>
                Instruções base que guiam o comportamento do agente.
              </CardDescription>
            </div>
            {systemPrompt && !isGeneratingPrompt && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegeneratePrompt}
                disabled={isTriggeringGeneration || isGeneratingPrompt}
                className="shrink-0 gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Regenerar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isGeneratingPrompt && !systemPrompt ? (
            <GenerationLoadingCard
              title="Gerando prompt do agente..."
              description="Criando instruções personalizadas para o seu negócio..."
            />
          ) : promptError && !systemPrompt ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-sm text-destructive">{promptError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegeneratePrompt}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Regenerar Prompt
              </Button>
            </div>
          ) : systemPrompt ? (
            <Collapsible open={isPromptOpen} onOpenChange={setIsPromptOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-2 gap-1.5 text-muted-foreground"
                >
                  {isPromptOpen ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                  {isPromptOpen ? 'Ocultar prompt' : 'Mostrar prompt'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={12}
                  className="min-h-[300px] text-sm"
                />
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </CardContent>
      </Card>

      {/* Secao 2: Etapas de Atendimento */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Etapas de Atendimento</CardTitle>
              <CardDescription>
                Fluxo de conversação que o agente seguirá com cada cliente.
              </CardDescription>
            </div>
            {agentSteps && !isGeneratingSteps && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerateSteps}
                disabled={isTriggeringGeneration || isGeneratingSteps}
                className="shrink-0 gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Regenerar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isGeneratingSteps && !agentSteps ? (
            <GenerationLoadingCard
              title="Gerando etapas de atendimento..."
              description="Criando o fluxo personalizado para o seu processo comercial..."
            />
          ) : stepsError && !agentSteps ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-sm text-destructive">{stepsError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerateSteps}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Regenerar Etapas
              </Button>
            </div>
          ) : agentSteps ? (
            <div className="flex flex-col gap-2">
              {agentSteps.map((step) => (
                <StepCard
                  key={step.order}
                  step={step}
                  onNameChange={(name) => updateStep(step.order, 'name', name)}
                  onKeyQuestionChange={(value) =>
                    updateStep(step.order, 'keyQuestion', value)
                  }
                  onMessageTemplateChange={(value) =>
                    updateStep(step.order, 'messageTemplate', value)
                  }
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Skeleton se nenhum dado ainda e ambos gerando */}
      {!systemPrompt && !agentSteps && isGenerating && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      {/* Botoes */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground"
          disabled={isSeeding}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={!bothReady || isSeeding}
          className="gap-2"
        >
          {isSeeding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isSeeding ? 'Configurando...' : 'Confirmar e Configurar'}
        </Button>
      </div>
    </div>
  )
}
