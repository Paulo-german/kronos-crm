import { Clock } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Switch } from '@/_components/ui/switch'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Label } from '@/_components/ui/label'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { TIMEZONE_OPTIONS, DAY_LABELS, DAY_KEYS } from '../constants'
import type { SectionProps } from './types'

export const BusinessHoursSection = ({ form, canManage }: SectionProps) => {
  const watchBusinessHoursEnabled = form.watch('businessHoursEnabled')

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className={watchBusinessHoursEnabled ? 'pb-3' : 'pb-5'}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-4 w-4" />
              Horário de Funcionamento
            </CardTitle>
            <CardDescription>
              Defina quando o agente deve responder mensagens.
            </CardDescription>
          </div>
          <FormField
            control={form.control}
            name="businessHoursEnabled"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canManage}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardHeader>

      {watchBusinessHoursEnabled && (
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="businessHoursTimezone"
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
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Dias e Horários</Label>
            <div className="rounded-md border border-border/50">
              {DAY_KEYS.map((dayKey) => (
                <div
                  key={dayKey}
                  className="flex items-center gap-3 border-b border-border/30 px-3 py-2 last:border-b-0"
                >
                  <FormField
                    control={form.control}
                    name={`businessHoursConfig.${dayKey}.enabled`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!canManage}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <span className="w-20 text-sm font-medium">
                    {DAY_LABELS[dayKey]}
                  </span>

                  <FormField
                    control={form.control}
                    name={`businessHoursConfig.${dayKey}.start`}
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
                                `businessHoursConfig.${dayKey}.enabled`,
                              )
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <span className="text-sm text-muted-foreground">até</span>

                  <FormField
                    control={form.control}
                    name={`businessHoursConfig.${dayKey}.end`}
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
                                `businessHoursConfig.${dayKey}.enabled`,
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

          <FormField
            control={form.control}
            name="outOfHoursMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem fora do horário</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Olá! Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Retornaremos assim que possível!"
                    className="min-h-[80px] resize-y"
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    disabled={!canManage}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Se preenchida, será enviada automaticamente quando alguém
                  enviar mensagem fora do horário.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      )}
    </Card>
  )
}
