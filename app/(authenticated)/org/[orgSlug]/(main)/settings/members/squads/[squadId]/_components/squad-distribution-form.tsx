'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { BarChart2, Heart, ListOrdered, Loader2, RotateCcw } from 'lucide-react'
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
  FormMessage,
} from '@/_components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { Button } from '@/_components/ui/button'
import { updateSquad } from '@/_actions/squad/update-squad'
import { updateSquadSchema, type UpdateSquadInput } from '@/_actions/squad/update-squad/schema'
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
    value: 'LOYALTY',
    label: 'Fidelidade',
    description: 'Prioriza o membro que já atendeu o contato antes.',
    icon: Heart,
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
  const form = useForm<UpdateSquadInput>({
    resolver: zodResolver(updateSquadSchema),
    defaultValues: {
      id: squad.id,
      distributionModel: squad.distributionModel,
    },
  })

  const { execute, isPending } = useAction(updateSquad, {
    onSuccess: () => {
      toast.success('Modelo de distribuição atualizado!')
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar.')
    },
  })

  const onSubmit = (data: UpdateSquadInput) => {
    execute(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modelo de distribuição</CardTitle>
            <CardDescription>
              Define como os leads são atribuídos automaticamente aos membros do time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="distributionModel"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!canManage}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    {DISTRIBUTION_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const isSelected = field.value === option.value

                      return (
                        <Label
                          key={option.value}
                          htmlFor={`squad-distribution-${option.value}`}
                          className={cn(
                            'flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-all',
                            !canManage && 'cursor-not-allowed opacity-60',
                            canManage && 'hover:border-primary/40 hover:bg-primary/5',
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

            <SquadDistributionPreview model={form.watch('distributionModel') ?? squad.distributionModel} />

            {canManage && (
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
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
