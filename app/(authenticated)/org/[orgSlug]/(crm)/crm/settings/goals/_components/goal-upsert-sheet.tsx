'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { cn } from '@/_lib/utils'
import { createGoal } from '@/_actions/goal/create-goal'
import { updateGoal } from '@/_actions/goal/update-goal'
import { createGoalSchema } from '@/_actions/goal/create-goal/schema'
import { updateGoalSchema } from '@/_actions/goal/update-goal/schema'
import type { GoalWithProgressDto } from '@/_data-access/goal/shared/goal-types'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { GoalWizardStep1 } from './goal-wizard-step-1'
import { GoalWizardStep2 } from './goal-wizard-step-2'
import { PeriodWindowHint } from './period-window-hint'
import type { CreateGoalFormValues, UpdateGoalFormValues } from './goal-form-types'
import type { GoalPeriod } from '@prisma/client'

const GOAL_TYPE_LABELS: Record<string, string> = {
  REVENUE: 'Receita',
  DEALS_CLOSED: 'Negócios fechados',
  DEALS_OPENED: 'Negócios abertos',
  ACTIVITIES: 'Atividades',
  CONVERSATIONS: 'Conversas',
}

const GOAL_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
}

interface GoalUpsertSheetProps {
  mode: 'create' | 'edit'
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  goal?: GoalWithProgressDto | null
  pipelines: OrgPipelineDto[]
  members: AcceptedMemberDto[]
  onSuccess?: () => void
}

function CreateGoalForm({
  pipelines,
  members,
  onClose,
}: {
  pipelines: OrgPipelineDto[]
  members: AcceptedMemberDto[]
  onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)

  const form = useForm<CreateGoalFormValues>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      type: 'REVENUE',
      scope: 'ORG',
      period: 'MONTHLY',
      targetValue: 0,
      targetUserId: null,
      targetPipelineId: null,
    },
  })

  const { execute, isPending } = useAction(createGoal, {
    onSuccess: () => {
      toast.success('Meta criada com sucesso!')
      form.reset()
      setStep(1)
      onClose()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar meta.')
    },
  })

  const handleNext = async () => {
    const isStep1Valid = await form.trigger([
      'type',
      'scope',
      'period',
      'targetPipelineId',
      'targetUserId',
    ])
    if (isStep1Valid) {
      setStep(2)
    }
  }

  const handleBack = () => setStep(1)

  const onSubmit = (data: CreateGoalFormValues) => {
    execute({
      type: data.type,
      scope: data.scope,
      period: data.period,
      targetValue: Number(data.targetValue),
      targetUserId: data.targetUserId ?? null,
      targetPipelineId: data.targetPipelineId ?? null,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        {step === 1 ? (
          <GoalWizardStep1 pipelines={pipelines} members={members} />
        ) : (
          <GoalWizardStep2 />
        )}

        <div className="flex justify-between gap-2 border-t pt-4">
          {step === 2 ? (
            <Button type="button" variant="outline" onClick={handleBack}>
              Voltar
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Passo {step} de 2
            </span>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {step === 1 ? (
              <Button type="button" onClick={handleNext}>
                Próximo
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Criar meta'
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}

function EditGoalForm({
  goal,
  onClose,
}: {
  goal: GoalWithProgressDto
  onClose: () => void
}) {
  const form = useForm<UpdateGoalFormValues>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      id: goal.id,
      targetValue: goal.targetValue,
      period: goal.period,
    },
  })

  const { execute, isPending } = useAction(updateGoal, {
    onSuccess: () => {
      toast.success('Meta atualizada com sucesso!')
      onClose()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar meta.')
    },
  })

  const watchedPeriod = form.watch('period')
  const isRevenue = goal.type === 'REVENUE'

  const onSubmit = (data: UpdateGoalFormValues) => {
    execute({
      id: data.id,
      ...(data.targetValue !== undefined && {
        targetValue: Number(data.targetValue),
      }),
      ...(data.period !== undefined && { period: data.period }),
    })
  }

  const getScopeLabel = () => {
    if (goal.scope === 'PIPELINE' && goal.targetPipelineName) {
      return `Funil: ${goal.targetPipelineName}`
    }
    if (goal.scope === 'MEMBER' && goal.targetUserName) {
      return `Vendedor: ${goal.targetUserName}`
    }
    return 'Organização'
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        {/* Campos imutáveis como read-only */}
        <dl className="space-y-3 rounded-md border border-border/50 bg-muted/30 p-4">
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">Tipo</dt>
            <dd className="text-sm font-medium">
              {GOAL_TYPE_LABELS[goal.type] ?? goal.type}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">Escopo</dt>
            <dd className="text-sm font-medium">{getScopeLabel()}</dd>
          </div>
        </dl>

        {/* Período editável */}
        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Período</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-2 gap-2"
                >
                  {(
                    Object.entries(GOAL_PERIOD_LABELS) as [GoalPeriod, string][]
                  ).map(([value, label]) => (
                    <div
                      key={value}
                      className={cn(
                        'flex items-center space-x-2 rounded-md border px-3 py-2.5 transition-colors',
                        field.value === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/80',
                      )}
                    >
                      <RadioGroupItem
                        value={value}
                        id={`edit-period-${value}`}
                      />
                      <Label
                        htmlFor={`edit-period-${value}`}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedPeriod && <PeriodWindowHint period={watchedPeriod} />}

        {/* Valor editável */}
        <FormField
          control={form.control}
          name="targetValue"
          render={({ field }) => {
            const numericValue = Number(field.value)
            return (
              <FormItem>
                <FormLabel>
                  {isRevenue ? 'Valor alvo (R$)' : 'Quantidade alvo'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={isRevenue ? 'Ex: 50000' : 'Ex: 30'}
                    min={0}
                    step={isRevenue ? 100 : 1}
                    value={isNaN(numericValue) ? '' : numericValue}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ''
                          ? undefined
                          : event.target.valueAsNumber,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar alterações'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function GoalUpsertSheet({
  mode,
  isOpen,
  onOpenChange,
  goal,
  pipelines,
  members,
}: GoalUpsertSheetProps) {
  const handleClose = () => onOpenChange(false)

  const title = mode === 'create' ? 'Nova meta' : 'Editar meta'
  const description =
    mode === 'create'
      ? 'Configure uma nova meta de vendas para a sua equipe.'
      : 'Ajuste o valor alvo ou o período desta meta.'

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="mb-6">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        {mode === 'create' && (
          <CreateGoalForm
            pipelines={pipelines}
            members={members}
            onClose={handleClose}
          />
        )}

        {mode === 'edit' && goal && (
          <EditGoalForm goal={goal} onClose={handleClose} />
        )}
      </SheetContent>
    </Sheet>
  )
}
