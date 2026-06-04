'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  BarChart2,
  Heart,
  ListOrdered,
  Loader2,
  RotateCcw,
  Zap,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { Button } from '@/_components/ui/button'
import { updateDistributionModel } from '@/_actions/scheduling/update-distribution-model'
import {
  updateDistributionModelSchema,
  type UpdateDistributionModelInput,
} from '@/_actions/scheduling/update-distribution-model/schema'
import { ManualOrderList } from './manual-order-list'
import { DistributionModelPreview } from './distribution-model-preview'
import type { SchedulingSettingsDto } from '@/_data-access/organization/get-scheduling-settings'
import type { LucideIcon } from 'lucide-react'

interface ModelOption {
  value: string
  label: string
  description: string
  icon: LucideIcon
}

export const PRIMARY_MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'UTILIZATION',
    label: 'Maior disponibilidade',
    description:
      'Prioriza quem tem menos agendamentos na semana, distribuindo a carga igualmente.',
    icon: BarChart2,
  },
  {
    value: 'ROUND_ROBIN',
    label: 'Rotação sequencial',
    description:
      'Cada agendamento vai para o próximo da fila, independente da carga atual.',
    icon: RotateCcw,
  },
  {
    value: 'FIRST_AVAILABLE',
    label: 'Primeiro disponível',
    description:
      'Seleciona o slot mais próximo no tempo, sem preferência por profissional.',
    icon: Zap,
  },
  {
    value: 'LOYALTY',
    label: 'Fidelização',
    description:
      'Prioriza o profissional que já atendeu o contato antes. Ideal para salões e clínicas.',
    icon: Heart,
  },
  {
    value: 'MANUAL',
    label: 'Ordem manual',
    description:
      'Você define a prioridade dos profissionais arrastando a lista abaixo.',
    icon: ListOrdered,
  },
]

const SECONDARY_MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'UTILIZATION',
    label: 'Maior disponibilidade',
    description: 'Menor carga na semana',
    icon: BarChart2,
  },
  {
    value: 'ROUND_ROBIN',
    label: 'Rotação sequencial',
    description: 'Próximo na fila',
    icon: RotateCcw,
  },
  {
    value: 'FIRST_AVAILABLE',
    label: 'Primeiro disponível',
    description: 'Slot mais próximo',
    icon: Zap,
  },
]

interface DistributionModelFormProps {
  settings: SchedulingSettingsDto
  allProfessionals: { id: string; name: string }[]
}

type SecondaryModel = 'UTILIZATION' | 'ROUND_ROBIN' | 'FIRST_AVAILABLE'
const VALID_SECONDARY: SecondaryModel[] = [
  'UTILIZATION',
  'ROUND_ROBIN',
  'FIRST_AVAILABLE',
]

export function DistributionModelForm({
  settings,
  allProfessionals,
}: DistributionModelFormProps) {
  const secondaryDefault = VALID_SECONDARY.includes(
    settings.secondaryDistributionModel as SecondaryModel,
  )
    ? (settings.secondaryDistributionModel as SecondaryModel)
    : undefined

  const form = useForm<UpdateDistributionModelInput>({
    resolver: zodResolver(updateDistributionModelSchema),
    defaultValues: {
      distributionModel: settings.distributionModel,
      secondaryDistributionModel: secondaryDefault,
    },
  })

  const watchedModel = form.watch('distributionModel')

  const { execute, isPending } = useAction(updateDistributionModel, {
    onSuccess: () => {
      toast.success('Configuração salva!')
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar.')
    },
  })

  const onSubmit = (data: UpdateDistributionModelInput) => {
    execute(data)
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Modelo de distribuição
              </CardTitle>
              <CardDescription>
                Define como os agendamentos são atribuídos automaticamente
                quando o cliente não especifica um profissional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="distributionModel"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="sr-only">Modelo principal</FormLabel>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        if (value !== 'LOYALTY') {
                          form.setValue('secondaryDistributionModel', undefined)
                        }
                      }}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {PRIMARY_MODEL_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const isSelected = field.value === option.value

                        return (
                          <Label
                            key={option.value}
                            htmlFor={`distribution-model-${option.value}`}
                            className={cn(
                              'flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-all',
                              'hover:border-primary/40 hover:bg-primary/5',
                              isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border bg-card',
                            )}
                          >
                            <RadioGroupItem
                              id={`distribution-model-${option.value}`}
                              value={option.value}
                              className="sr-only"
                            />
                            <div
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-md',
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <p
                                className={cn(
                                  'text-sm font-semibold',
                                  isSelected && 'text-primary',
                                )}
                              >
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DistributionModelPreview model={watchedModel} />

              {watchedModel === 'LOYALTY' && (
                <FormField
                  control={form.control}
                  name="secondaryDistributionModel"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div className="space-y-0.5">
                        <FormLabel>Fallback de fidelização</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Usado quando o profissional fiel não está disponível
                          no horário.
                        </p>
                      </div>
                      <RadioGroup
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value)}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                      >
                        {SECONDARY_MODEL_OPTIONS.map((option) => {
                          const Icon = option.icon
                          const isSelected = field.value === option.value

                          return (
                            <Label
                              key={option.value}
                              htmlFor={`secondary-model-${option.value}`}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                                'hover:border-primary/40 hover:bg-primary/5',
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                  : 'border-border bg-card',
                              )}
                            >
                              <RadioGroupItem
                                id={`secondary-model-${option.value}`}
                                value={option.value}
                                className="sr-only"
                              />
                              <div
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                                  isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p
                                  className={cn(
                                    'text-xs font-semibold',
                                    isSelected && 'text-primary',
                                  )}
                                >
                                  {option.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {option.description}
                                </p>
                              </div>
                            </Label>
                          )
                        })}
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </Form>

      {watchedModel === 'MANUAL' && (
        <ManualOrderList
          professionals={settings.manualOrder}
          allProfessionals={allProfessionals}
        />
      )}
    </div>
  )
}
