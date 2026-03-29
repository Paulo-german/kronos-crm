'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { Form } from '@/_components/ui/form'
import { Button } from '@/_components/ui/button'
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  Filter,
  Cog,
} from 'lucide-react'
import { createAutomation } from '@/_actions/automation/create-automation'
import {
  type CreateAutomationInput,
} from '@/_actions/automation/create-automation/schema'
import type { UpdateAutomationInput } from '@/_actions/automation/update-automation/schema'
import { WizardStepTrigger } from './wizard-step-trigger'
import { WizardStepConditions } from './wizard-step-conditions'
import { WizardStepAction } from './wizard-step-action'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { DealLostReasonDto } from '@/_data-access/settings/get-lost-reasons'
import { cn } from '@/_lib/utils'
import {
  automationFormSchema,
  type AutomationFormValues,
  type AutomationWizardEditData,
} from './wizard-form-types'
import { TRIGGER_LABELS, ACTION_LABELS } from './automation-labels'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent } from '@/_components/ui/card'

const WIZARD_STEPS = [
  { label: 'Gatilho', description: 'Quando ativar', icon: Zap },
  { label: 'Condições', description: 'Filtros opcionais', icon: Filter },
  { label: 'Ação', description: 'O que fazer', icon: Cog },
]

const DEFAULT_FORM_VALUES: Partial<AutomationFormValues> = {
  name: '',
  description: undefined,
  triggerConfig: {},
  conditions: [],
  actionConfig: {},
}

interface AutomationWizardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelines: OrgPipelineDto[]
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
  lossReasons: DealLostReasonDto[]
  editingAutomation?: AutomationWizardEditData | null
  onUpdate?: (data: UpdateAutomationInput) => void
  isUpdating?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para gerar descrições legíveis da configuração do trigger e da action
// ─────────────────────────────────────────────────────────────────────────────

function formatThreshold(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`
  return `${Math.round(minutes / 1440)} dia(s)`
}

function buildTriggerDescription(
  triggerConfig: Record<string, unknown>,
  stageOptions: PipelineStageOption[],
): string {
  const stageId =
    typeof triggerConfig.stageId === 'string' ? triggerConfig.stageId : null
  const threshold =
    typeof triggerConfig.thresholdMinutes === 'number'
      ? triggerConfig.thresholdMinutes
      : null

  if (stageId) {
    const stage = stageOptions.find((s) => s.stageId === stageId)
    if (stage) return `Estágio: ${stage.stageName}`
  }
  if (threshold !== null) return `Após ${formatThreshold(threshold)}`

  const fromStageId =
    typeof triggerConfig.fromStageId === 'string'
      ? triggerConfig.fromStageId
      : null
  const toStageId =
    typeof triggerConfig.toStageId === 'string' ? triggerConfig.toStageId : null
  if (fromStageId || toStageId) {
    const from =
      stageOptions.find((s) => s.stageId === fromStageId)?.stageName ??
      'qualquer'
    const to =
      stageOptions.find((s) => s.stageId === toStageId)?.stageName ?? 'qualquer'
    return `De ${from} → ${to}`
  }

  return 'Qualquer negociação'
}

function buildActionDescription(
  actionConfig: Record<string, unknown>,
  stageOptions: PipelineStageOption[],
  members: AcceptedMemberDto[],
): string {
  const strategy =
    typeof actionConfig.strategy === 'string' ? actionConfig.strategy : null
  const targetStageId =
    typeof actionConfig.targetStageId === 'string'
      ? actionConfig.targetStageId
      : null
  const targetPriority =
    typeof actionConfig.targetPriority === 'string'
      ? actionConfig.targetPriority
      : null

  if (strategy) {
    const strategyLabels: Record<string, string> = {
      round_robin: 'Rotação',
      specific_user: 'Membro específico',
      least_deals: 'Menor carga',
    }
    return strategyLabels[strategy] ?? strategy
  }
  if (targetStageId) {
    const stage = stageOptions.find((s) => s.stageId === targetStageId)
    if (stage) return `Para ${stage.stageName}`
  }
  if (targetPriority) {
    const priorityLabels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    }
    return `Prioridade: ${priorityLabels[targetPriority] ?? targetPriority}`
  }

  const targetUserIds = Array.isArray(actionConfig.targetUserIds)
    ? (actionConfig.targetUserIds as string[])
    : []
  if (targetUserIds.length > 0) {
    const names = targetUserIds.slice(0, 2).map((id) => {
      const member = members.find((m) => (m.userId ?? m.id) === id)
      return member?.user?.fullName ?? member?.email ?? id
    })
    return (
      names.join(', ') +
      (targetUserIds.length > 2 ? ` +${targetUserIds.length - 2}` : '')
    )
  }

  return 'Configurado'
}

// ─────────────────────────────────────────────────────────────────────────────
// WizardSummaryPreview — card de resumo exibido no último step antes de salvar
// ─────────────────────────────────────────────────────────────────────────────

interface WizardSummaryPreviewProps {
  triggerType: AutomationFormValues['triggerType']
  triggerConfig: Record<string, unknown>
  conditions: AutomationFormValues['conditions']
  actionType: AutomationFormValues['actionType']
  actionConfig: Record<string, unknown>
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
}

function WizardSummaryPreview({
  triggerType,
  triggerConfig,
  conditions,
  actionType,
  actionConfig,
  stageOptions,
  members,
}: WizardSummaryPreviewProps) {
  const triggerLabel = triggerType ? TRIGGER_LABELS[triggerType] : '—'
  const actionLabel = actionType ? ACTION_LABELS[actionType] : '—'
  const triggerDesc = triggerType
    ? buildTriggerDescription(triggerConfig, stageOptions)
    : ''
  const actionDesc = actionType
    ? buildActionDescription(actionConfig, stageOptions, members)
    : ''
  const conditionsCount = Array.isArray(conditions) ? conditions.length : 0

  return (
    <Card className="mt-6 bg-muted/50">
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resumo da automação
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
          {/* Quando */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 shrink-0 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quando
              </span>
            </div>
            <Badge
              variant="secondary"
              className="w-fit max-w-full truncate text-xs"
            >
              {triggerLabel}
            </Badge>
            {triggerDesc && (
              <span className="text-[11px] text-muted-foreground">
                {triggerDesc}
              </span>
            )}
          </div>

          <span className="hidden self-center text-muted-foreground/40 sm:block">
            →
          </span>

          {/* Se */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Se
              </span>
            </div>
            <Badge
              variant={conditionsCount > 0 ? 'secondary' : 'outline'}
              className="w-fit text-xs"
            >
              {conditionsCount > 0
                ? `${conditionsCount} condição(ões)`
                : 'Sem condições'}
            </Badge>
          </div>

          <span className="hidden self-center text-muted-foreground/40 sm:block">
            →
          </span>

          {/* Faz */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Cog className="h-3 w-3 shrink-0 text-green-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Faz
              </span>
            </div>
            <Badge
              variant="secondary"
              className="w-fit max-w-full truncate text-xs"
            >
              {actionLabel}
            </Badge>
            {actionDesc && (
              <span className="text-[11px] text-muted-foreground">
                {actionDesc}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Converte os dados do wizard para o formato de entrada da action de criação.
// Garante type-safety sem double-cast.
function buildCreateInput(data: AutomationFormValues): CreateAutomationInput {
  return {
    name: data.name,
    description: data.description,
    triggerType: data.triggerType,
    triggerConfig: data.triggerConfig,
    conditions: data.conditions ?? [],
    actionType: data.actionType,
    actionConfig: data.actionConfig,
  }
}

// Rola suavemente para o primeiro elemento com data-error="true" ou .text-destructive
// dentro do container do sheet, para focar o usuário no primeiro campo com erro.
function scrollToFirstError() {
  requestAnimationFrame(() => {
    const errorEl =
      document.querySelector<HTMLElement>('[data-error="true"]') ??
      document.querySelector<HTMLElement>('.text-destructive')
    errorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

// Verifica se os campos obrigatórios de triggerConfig estão preenchidos.
// Retorna uma mensagem de erro ou null quando tudo está ok.
function validateTriggerConfig(
  triggerType: AutomationFormValues['triggerType'] | undefined,
  triggerConfig: Record<string, unknown>,
): string | null {
  if (triggerType === 'DEAL_STALE') {
    if (!triggerConfig.thresholdMinutes) return 'Selecione o período para o gatilho'
  }
  if (triggerType === 'DEAL_IDLE_IN_STAGE') {
    if (!triggerConfig.stageId) return 'Selecione o estágio para o gatilho'
    if (!triggerConfig.thresholdMinutes) return 'Selecione o período para o gatilho'
  }
  return null
}

// Verifica se os campos obrigatórios de actionConfig estão preenchidos.
// Retorna uma mensagem de erro ou null quando tudo está ok.
function validateActionConfig(
  actionType: AutomationFormValues['actionType'] | undefined,
  actionConfig: Record<string, unknown>,
): string | null {
  if (actionType === 'REASSIGN_DEAL') {
    if (!actionConfig.strategy) return 'Selecione a estratégia de atribuição'
    const targetUserIds = Array.isArray(actionConfig.targetUserIds)
      ? actionConfig.targetUserIds
      : []
    if (targetUserIds.length === 0) return 'Selecione ao menos um membro'
  }
  if (actionType === 'MOVE_DEAL_TO_STAGE') {
    if (!actionConfig.targetStageId) return 'Selecione o estágio de destino'
  }
  if (actionType === 'NOTIFY_USER') {
    if (!actionConfig.targetType) return 'Selecione quem receberá a notificação'
    if (!actionConfig.messageTemplate) return 'Digite a mensagem da notificação'
    if (actionConfig.targetType === 'specific_users') {
      const targetUserIds = Array.isArray(actionConfig.targetUserIds)
        ? actionConfig.targetUserIds
        : []
      if (targetUserIds.length === 0) return 'Selecione ao menos um membro para notificar'
    }
  }
  if (actionType === 'UPDATE_DEAL_PRIORITY') {
    if (!actionConfig.targetPriority) return 'Selecione a prioridade'
  }
  return null
}

export function AutomationWizardSheet({
  open,
  onOpenChange,
  pipelines,
  stageOptions,
  members,
  lossReasons,
  editingAutomation,
  onUpdate,
  isUpdating = false,
}: AutomationWizardSheetProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showTriggerConfigErrors, setShowTriggerConfigErrors] = useState(false)
  const [showActionConfigErrors, setShowActionConfigErrors] = useState(false)
  // isEditing = true apenas quando há um ID real (não duplicação)
  const isEditing = !!editingAutomation && editingAutomation.id !== ''

  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createAutomation,
    {
      onSuccess: () => {
        toast.success('Automação criada com sucesso!')
        handleClose()
      },
      onError: ({ error }) => {
        // Tenta extrair erros de validação específicos do servidor
        if (error.validationErrors) {
          const topLevelErrors = (error.validationErrors as Record<string, unknown>)._errors
          if (Array.isArray(topLevelErrors) && topLevelErrors.length > 0) {
            toast.error(String(topLevelErrors[0]))
            return
          }
          const fields = Object.keys(error.validationErrors).filter(
            (key) => key !== '_errors',
          )
          if (fields.length > 0) {
            toast.error(`Corrija os campos: ${fields.join(', ')}`)
            return
          }
        }
        toast.error(error.serverError ?? 'Erro ao criar automação.')
      },
    },
  )

  const isPending = isCreating || isUpdating

  const handleClose = () => {
    form.reset(DEFAULT_FORM_VALUES)
    setCurrentStep(0)
    setShowTriggerConfigErrors(false)
    setShowActionConfigErrors(false)
    onOpenChange(false)
  }

  // Sincroniza o form com `editingAutomation` quando o sheet abre para edição/duplicação.
  // useEffect é legítimo aqui: sincroniza o estado interno do form
  // com props externas (open + editingAutomation) controladas pelo parent.
  useEffect(() => {
    if (open && editingAutomation) {
      form.reset({
        name: editingAutomation.name,
        description: editingAutomation.description ?? undefined,
        triggerType: editingAutomation.triggerType,
        triggerConfig: editingAutomation.triggerConfig,
        conditions:
          (editingAutomation.conditions as AutomationFormValues['conditions']) ??
          [],
        actionType: editingAutomation.actionType,
        actionConfig: editingAutomation.actionConfig,
      })
      setCurrentStep(0)
      setShowTriggerConfigErrors(false)
      setShowActionConfigErrors(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingAutomation])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose()
    }
  }

  const handleNext = async () => {
    // Valida campos do step atual antes de avançar
    let fieldsToValidate: (keyof AutomationFormValues)[] = []

    if (currentStep === 0) {
      fieldsToValidate = ['name', 'triggerType', 'triggerConfig']
    } else if (currentStep === 1) {
      fieldsToValidate = ['conditions']
    }

    const isFormValid = await form.trigger(fieldsToValidate)

    // Validação manual dos campos de config do step 0 (triggerConfig)
    if (currentStep === 0) {
      const triggerType = form.getValues('triggerType')
      const triggerConfig = form.getValues('triggerConfig') as Record<string, unknown>
      const configError = validateTriggerConfig(triggerType, triggerConfig)

      if (configError) {
        setShowTriggerConfigErrors(true)
        scrollToFirstError()
        return
      }

      setShowTriggerConfigErrors(false)
    }

    if (!isFormValid) {
      scrollToFirstError()
      return
    }

    setCurrentStep((previous) =>
      Math.min(previous + 1, WIZARD_STEPS.length - 1),
    )
  }

  const handleBack = () => {
    setCurrentStep((previous) => Math.max(previous - 1, 0))
  }

  const handleSubmit = (data: AutomationFormValues) => {
    // Validação manual dos campos de config do step 2 (actionConfig)
    const actionConfig = data.actionConfig as Record<string, unknown>
    const configError = validateActionConfig(data.actionType, actionConfig)

    if (configError) {
      setShowActionConfigErrors(true)
      scrollToFirstError()
      return
    }

    setShowActionConfigErrors(false)

    if (isEditing && editingAutomation) {
      onUpdate?.({
        id: editingAutomation.id,
        name: data.name,
        description: data.description ?? null,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        conditions: data.conditions ?? [],
        actionType: data.actionType,
        actionConfig: data.actionConfig,
      })
      return
    }

    executeCreate(buildCreateInput(data))
  }

  const isLastStep = currentStep === WIZARD_STEPS.length - 1

  // Verifica se um step tem erros para mostrar o indicador vermelho no stepper
  const stepHasErrors = (stepIndex: number): boolean => {
    const errors = form.formState.errors
    if (stepIndex === 0) {
      return !!(errors.name ?? errors.triggerType ?? errors.triggerConfig)
    }
    if (stepIndex === 1) {
      return !!errors.conditions
    }
    if (stepIndex === 2) {
      return !!(errors.actionType ?? errors.actionConfig)
    }
    return false
  }

  // Observa valores do form para alimentar o WizardSummaryPreview no último step
  const watchedTriggerType = form.watch('triggerType')
  const watchedTriggerConfig = form.watch('triggerConfig') as Record<
    string,
    unknown
  >
  const watchedConditions = form.watch('conditions')
  const watchedActionType = form.watch('actionType')
  const watchedActionConfig = form.watch('actionConfig') as Record<
    string,
    unknown
  >

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Editar Automação' : 'Nova Automação'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Atualize as configurações da automação.'
              : 'Configure o gatilho, condições e ação desta automação.'}
          </SheetDescription>
        </SheetHeader>

        {/* Stepper — steps já completados são clicáveis para navegar diretamente */}
        <div className="flex w-full items-center pb-4 pt-2">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isLast = index === WIZARD_STEPS.length - 1
            const hasErrors = stepHasErrors(index)
            return (
              <div key={step.label} className={cn('flex items-center', !isLast && 'flex-1')}>
                <div
                  className={cn(
                    'flex flex-col items-center gap-1',
                    isCompleted && 'cursor-pointer',
                  )}
                  onClick={
                    isCompleted ? () => setCurrentStep(index) : undefined
                  }
                  role={isCompleted ? 'button' : undefined}
                  tabIndex={isCompleted ? 0 : undefined}
                  onKeyDown={
                    isCompleted
                      ? (event) => event.key === 'Enter' && setCurrentStep(index)
                      : undefined
                  }
                  aria-label={
                    isCompleted
                      ? `Voltar para o passo ${index + 1}: ${step.label}`
                      : undefined
                  }
                >
                  {/* Círculo do step com indicador de erro opcional */}
                  <div className="relative">
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                        isCompleted
                          ? 'border-primary bg-primary text-white hover:opacity-80'
                          : isCurrent
                            ? 'border-primary text-primary'
                            : 'border-muted-foreground/30 text-muted-foreground/50',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <step.icon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    {/* Indicador vermelho de erro no canto superior direito */}
                    {hasErrors && (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive"
                        aria-label="Este passo contém erros"
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      isCurrent
                        ? 'text-foreground'
                        : 'text-muted-foreground/60',
                      isCompleted && 'hover:text-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'mx-2 mb-4 h-px flex-1 transition-colors',
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Formulário com steps */}
        <Form {...form}>
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto pl-1 pr-1">
              {currentStep === 0 && (
                <WizardStepTrigger
                  pipelines={pipelines}
                  stageOptions={stageOptions}
                  showConfigErrors={showTriggerConfigErrors}
                />
              )}
              {currentStep === 1 && (
                <WizardStepConditions
                  stageOptions={stageOptions}
                  members={members}
                />
              )}
              {currentStep === 2 && (
                <>
                  <WizardStepAction
                    stageOptions={stageOptions}
                    members={members}
                    lossReasons={lossReasons}
                    showConfigErrors={showActionConfigErrors}
                  />
                  <WizardSummaryPreview
                    triggerType={watchedTriggerType}
                    triggerConfig={watchedTriggerConfig}
                    conditions={watchedConditions}
                    actionType={watchedActionType}
                    actionConfig={watchedActionConfig}
                    stageOptions={stageOptions}
                    members={members}
                  />
                </>
              )}
            </div>

            {/* Navegação do wizard */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? handleClose : handleBack}
              >
                {currentStep === 0 ? (
                  'Cancelar'
                ) : (
                  <>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </>
                )}
              </Button>

              {isLastStep ? (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={form.handleSubmit(handleSubmit)}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {isEditing ? 'Salvar alterações' : 'Criar automação'}
                    </>
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Próximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
