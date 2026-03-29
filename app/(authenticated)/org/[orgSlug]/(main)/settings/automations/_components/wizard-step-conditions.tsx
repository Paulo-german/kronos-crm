'use client'

import { useFormContext, useFieldArray } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Button } from '@/_components/ui/button'
import { PlusIcon, TrashIcon } from 'lucide-react'
import {
  CONDITION_FIELD_LABELS,
  CONDITION_OPERATOR_LABELS,
  PRIORITY_OPTIONS,
} from './automation-labels'
import type { AutomationFormValues } from './wizard-form-types'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

const MAX_CONDITIONS = 5

// ─────────────────────────────────────────────────────────────
// Componente auxiliar para o input de valor de condição
// Renderiza o controle correto dependendo do campo e do operador selecionados
// ─────────────────────────────────────────────────────────────

interface ConditionValueInputProps {
  conditionField: string
  operator: string
  value: string | string[]
  onChange: (value: string | string[]) => void
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
}

function ConditionValueInput({
  conditionField,
  operator,
  value,
  onChange,
  stageOptions,
  members,
}: ConditionValueInputProps) {
  const showArrayValue = operator === 'in' || operator === 'not_in'

  if (conditionField === 'stageId') {
    return (
      <Select value={value as string} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="Selecione o estágio" />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((stage) => (
            <SelectItem key={stage.stageId} value={stage.stageId}>
              {stage.pipelineName} → {stage.stageName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (conditionField === 'assignedTo') {
    return (
      <Select value={value as string} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="Selecione o membro" />
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem
              key={member.userId ?? member.id}
              value={member.userId ?? member.id}
            >
              {member.user?.fullName ?? member.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (conditionField === 'priority') {
    return (
      <Select value={value as string} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="Selecione a prioridade" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (conditionField === 'status') {
    return (
      <Select value={value as string} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="Selecione o status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (showArrayValue) {
    return (
      <Input
        className="h-8"
        placeholder="Valores separados por vírgula"
        value={Array.isArray(value) ? value.join(', ') : value}
        onChange={(event) => {
          const raw = event.target.value
          onChange(
            raw
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }}
      />
    )
  }

  return (
    <Input
      className="h-8"
      placeholder="Valor"
      value={value as string}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

const CONDITION_FIELDS = [
  'stageId',
  'assignedTo',
  'priority',
  'status',
  'value',
  'pipelineId',
] as const

const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'gt',
  'lt',
  'gte',
  'lte',
  'in',
  'not_in',
] as const

// Campos de seleção: apenas operadores de igualdade e pertencimento
const SELECTION_FIELDS = new Set([
  'stageId',
  'assignedTo',
  'priority',
  'status',
  'pipelineId',
])

// Mapa de operadores permitidos por tipo de campo
// Campos numéricos (value): todos os operadores
// Campos de seleção: apenas equals, not_equals, in, not_in
const FIELD_ALLOWED_OPERATORS: Record<
  string,
  ReadonlyArray<(typeof CONDITION_OPERATORS)[number]>
> = {
  value: CONDITION_OPERATORS,
}

function getAllowedOperators(
  field: string,
): ReadonlyArray<(typeof CONDITION_OPERATORS)[number]> {
  if (FIELD_ALLOWED_OPERATORS[field]) {
    return FIELD_ALLOWED_OPERATORS[field]
  }
  if (SELECTION_FIELDS.has(field)) {
    return ['equals', 'not_equals', 'in', 'not_in'] as const
  }
  return CONDITION_OPERATORS
}

const STATUS_OPTIONS = [
  { label: 'Aberta', value: 'OPEN' },
  { label: 'Em andamento', value: 'IN_PROGRESS' },
  { label: 'Ganha', value: 'WON' },
  { label: 'Perdida', value: 'LOST' },
  { label: 'Pausada', value: 'PAUSED' },
]

interface WizardStepConditionsProps {
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
}

export function WizardStepConditions({
  stageOptions,
  members,
}: WizardStepConditionsProps) {
  const form = useFormContext<AutomationFormValues>()

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'conditions',
  })

  const handleAddCondition = () => {
    if (fields.length >= MAX_CONDITIONS) return
    append({ field: 'stageId', operator: 'equals', value: '' })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Condições (Se)</h3>
        <p className="text-sm text-muted-foreground">
          Defina filtros opcionais que a negociação deve atender para a
          automação ser executada. Todas as condições serão aplicadas juntas
          (lógica E).
        </p>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma condição definida — a automação será executada para{' '}
            <span className="font-medium text-foreground">
              todas as negociações
            </span>{' '}
            que ativarem o gatilho.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((conditionEntry, index) => {
            const currentField =
              form.watch(`conditions.${index}.field`) ?? 'stageId'
            const currentOperator =
              form.watch(`conditions.${index}.operator`) ?? 'equals'

            return (
              <div key={conditionEntry.id} className="space-y-2">
                {index > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      E
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="flex items-start gap-2 rounded-md border bg-card p-3">
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    {/* Campo */}
                    <FormField
                      control={form.control}
                      name={`conditions.${index}.field`}
                      render={({ field: formField }) => (
                        <FormItem className="min-w-[160px] flex-1">
                          <Select
                            value={formField.value}
                            onValueChange={(val) => {
                              formField.onChange(val)
                              form.setValue(`conditions.${index}.value`, '')
                              // Ao trocar campo, verifica se o operador atual é permitido
                              // Se não for, reseta para 'equals' (sempre permitido)
                              const allowedOps = getAllowedOperators(val)
                              const currentOp = form.getValues(
                                `conditions.${index}.operator`,
                              )
                              if (
                                !allowedOps.includes(
                                  currentOp as (typeof CONDITION_OPERATORS)[number],
                                )
                              ) {
                                form.setValue(
                                  `conditions.${index}.operator`,
                                  'equals',
                                )
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Campo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONDITION_FIELDS.map((condField) => (
                                <SelectItem key={condField} value={condField}>
                                  {CONDITION_FIELD_LABELS[condField]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Operador — filtrado por tipo de campo */}
                    <FormField
                      control={form.control}
                      name={`conditions.${index}.operator`}
                      render={({ field: formField }) => {
                        const allowedOperators =
                          getAllowedOperators(currentField)
                        return (
                          <FormItem className="min-w-[100px] flex-1">
                            <Select
                              value={formField.value}
                              onValueChange={(val) => {
                                formField.onChange(val)
                                form.setValue(`conditions.${index}.value`, '')
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Operador" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allowedOperators.map((operator) => (
                                  <SelectItem key={operator} value={operator}>
                                    {CONDITION_OPERATOR_LABELS[operator]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    {/* Valor — delegado ao componente ConditionValueInput */}
                    <FormField
                      control={form.control}
                      name={`conditions.${index}.value`}
                      render={({ field: formField }) => (
                        <FormItem className="min-w-[160px] flex-1">
                          <FormControl>
                            <ConditionValueInput
                              conditionField={currentField}
                              operator={currentOperator}
                              value={formField.value as string | string[]}
                              onChange={formField.onChange}
                              stageOptions={stageOptions}
                              members={members}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <TrashIcon size={14} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddCondition}
        disabled={fields.length >= MAX_CONDITIONS}
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        {fields.length >= MAX_CONDITIONS
          ? `Máximo de ${MAX_CONDITIONS} condições atingido`
          : 'Adicionar condição'}
      </Button>
    </div>
  )
}
