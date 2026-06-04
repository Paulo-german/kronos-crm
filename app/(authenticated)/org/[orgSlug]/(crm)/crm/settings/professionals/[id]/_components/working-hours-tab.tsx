'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Switch } from '@/_components/ui/switch'

import { bulkSetWorkingHours } from '@/_actions/working-hours/bulk-set-working-hours'
import type { ProfessionalDetailDto } from '@/_data-access/professional/get-professional-by-id'

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const

// ---------------------------------------------------------------------------
// Schema local do form
// ---------------------------------------------------------------------------

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const daySchema = z.object({
  enabled: z.boolean(),
  startTime: z.string().regex(TIME_REGEX, 'Formato HH:mm'),
  endTime: z.string().regex(TIME_REGEX, 'Formato HH:mm'),
})

const formSchema = z.object({
  days: z.tuple([
    daySchema, // 0 domingo
    daySchema, // 1 segunda
    daySchema, // 2 terça
    daySchema, // 3 quarta
    daySchema, // 4 quinta
    daySchema, // 5 sexta
    daySchema, // 6 sábado
  ]),
})

type FormValues = z.infer<typeof formSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildDefaultValues = (
  workingHours: ProfessionalDetailDto['workingHours'],
): FormValues => {
  const existingMap = new Map(
    workingHours.map((wh) => [wh.dayOfWeek, wh]),
  )

  const days = ALL_DAYS.map((day) => {
    const existing = existingMap.get(day)
    return {
      enabled: existing !== undefined,
      startTime: existing?.startTime ?? '08:00',
      endTime: existing?.endTime ?? '18:00',
    }
  }) as FormValues['days']

  return { days }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkingHoursTabProps {
  professional: ProfessionalDetailDto
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const WorkingHoursTab = ({ professional }: WorkingHoursTabProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(professional.workingHours),
  })

  const { execute, isPending } = useAction(bulkSetWorkingHours, {
    onSuccess: () => {
      toast.success('Jornada salva com sucesso!')
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      toast.error((error.serverError as string | undefined) ?? 'Erro ao salvar jornada.')
    },
  })

  const onSubmit = (values: FormValues) => {
    execute({
      professionalId: professional.id,
      days: ALL_DAYS.map((day) => ({
        dayOfWeek: day,
        enabled: values.days[day].enabled,
        startTime: values.days[day].startTime,
        endTime: values.days[day].endTime,
      })),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Jornada Semanal de Trabalho
            </CardTitle>
            <CardDescription>
              Configure os dias e horários de atendimento. Exceções por data
              específica podem ser adicionadas na aba &quot;Exceções&quot;.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-md border border-border/50">
              {ALL_DAYS.map((day) => (
                <div
                  key={day}
                  className="flex items-center gap-3 border-b border-border/30 px-3 py-2 last:border-b-0"
                >
                  {/* Toggle do dia */}
                  <FormField
                    control={form.control}
                    name={`days.${day}.enabled`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label={`Ativar ${DAY_LABELS[day]}`}
                            className="scale-[0.85]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <span className="w-28 text-sm font-medium">
                    {DAY_LABELS[day]}
                  </span>

                  {/* Horário de início */}
                  <FormField
                    control={form.control}
                    name={`days.${day}.startTime`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            {...field}
                            disabled={!form.watch(`days.${day}.enabled`)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <span className="text-sm text-muted-foreground">até</span>

                  {/* Horário de fim */}
                  <FormField
                    control={form.control}
                    name={`days.${day}.endTime`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            {...field}
                            disabled={!form.watch(`days.${day}.enabled`)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !form.formState.isDirty}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}

export default WorkingHoursTab
