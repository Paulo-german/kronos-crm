'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Clock, Loader2 } from 'lucide-react'
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
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Switch } from '@/_components/ui/switch'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { Separator } from '@/_components/ui/separator'
import {
  followUpBusinessHoursConfigSchema,
  type FollowUpBusinessHoursConfig,
} from '@/_actions/follow-up/update-follow-up-business-hours/schema'
import { updateFollowUpBusinessHours } from '@/_actions/follow-up/update-follow-up-business-hours'
import {
  TIMEZONE_OPTIONS,
  DAY_LABELS,
  DAY_KEYS,
  DEFAULT_BUSINESS_HOURS_CONFIG,
} from './constants'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'

// ---------------------------------------------------------------------------
// Schema local do form
// ---------------------------------------------------------------------------

const formSchema = z.object({
  followUpBusinessHoursEnabled: z.boolean(),
  followUpBusinessHoursTimezone: z.string(),
  followUpBusinessHoursConfig: followUpBusinessHoursConfigSchema,
})

type FormValues = z.infer<typeof formSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FollowUpBusinessHoursSectionProps {
  agent: AgentDetailDto
  canManage: boolean
  onSaveSuccess?: () => void
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const FollowUpBusinessHoursSection = ({
  agent,
  canManage,
  onSaveSuccess,
}: FollowUpBusinessHoursSectionProps) => {
  const defaultConfig: FollowUpBusinessHoursConfig =
    (agent.followUpBusinessHoursConfig as FollowUpBusinessHoursConfig | null) ??
    (DEFAULT_BUSINESS_HOURS_CONFIG as FollowUpBusinessHoursConfig)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      followUpBusinessHoursEnabled: agent.followUpBusinessHoursEnabled,
      followUpBusinessHoursTimezone: agent.followUpBusinessHoursTimezone,
      followUpBusinessHoursConfig: defaultConfig,
    },
  })

  const watchEnabled = form.watch('followUpBusinessHoursEnabled')

  const { execute, isPending } = useAction(updateFollowUpBusinessHours, {
    onSuccess: () => {
      toast.success('Horário comercial dos follow-ups salvo!')
      form.reset(form.getValues())
      onSaveSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao salvar horário comercial.')
    },
  })

  const onSubmit = (values: FormValues) => {
    execute({
      agentId: agent.id,
      followUpBusinessHoursEnabled: values.followUpBusinessHoursEnabled,
      followUpBusinessHoursTimezone: values.followUpBusinessHoursTimezone,
      followUpBusinessHoursConfig: values.followUpBusinessHoursEnabled
        ? values.followUpBusinessHoursConfig
        : null,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="border-border/50 bg-card">
          <CardHeader className={watchEnabled ? 'pb-3' : 'pb-5'}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4" />
                  Horário de Envio
                </CardTitle>
                <CardDescription>
                  Restrinja os follow-ups automáticos ao horário comercial.
                </CardDescription>
              </div>

              <FormField
                control={form.control}
                name="followUpBusinessHoursEnabled"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canManage}
                        aria-label="Ativar horário comercial para follow-ups"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>

          {watchEnabled && (
            <>
              <Separator className="opacity-50" />
              <CardContent className="space-y-4 pt-4">
                {/* Fuso horário */}
                <FormField
                  control={form.control}
                  name="followUpBusinessHoursTimezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuso Horário</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!canManage}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Grade de dias e horários */}
                <div className="space-y-2">
                  <Label>Dias e Horários</Label>
                  <div className="rounded-md border border-border/50">
                    {DAY_KEYS.map((dayKey) => (
                      <div
                        key={dayKey}
                        className="flex items-center gap-3 border-b border-border/30 px-3 py-2 last:border-b-0"
                      >
                        {/* Toggle do dia */}
                        <FormField
                          control={form.control}
                          name={`followUpBusinessHoursConfig.${dayKey}.enabled`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!canManage}
                                  aria-label={`Ativar ${DAY_LABELS[dayKey]}`}
                                  className="scale-[0.85]"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <span className="w-20 text-sm font-medium">
                          {DAY_LABELS[dayKey]}
                        </span>

                        {/* Horário de início */}
                        <FormField
                          control={form.control}
                          name={`followUpBusinessHoursConfig.${dayKey}.start`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input
                                  type="time"
                                  className="h-8 w-28"
                                  {...field}
                                  disabled={
                                    !canManage ||
                                    !form.watch(
                                      `followUpBusinessHoursConfig.${dayKey}.enabled`,
                                    )
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <span className="text-sm text-muted-foreground">
                          até
                        </span>

                        {/* Horário de fim */}
                        <FormField
                          control={form.control}
                          name={`followUpBusinessHoursConfig.${dayKey}.end`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input
                                  type="time"
                                  className="h-8 w-28"
                                  {...field}
                                  disabled={
                                    !canManage ||
                                    !form.watch(
                                      `followUpBusinessHoursConfig.${dayKey}.enabled`,
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {canManage && (
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
                )}
              </CardContent>
            </>
          )}
        </Card>
      </form>
    </Form>
  )
}

export default FollowUpBusinessHoursSection
