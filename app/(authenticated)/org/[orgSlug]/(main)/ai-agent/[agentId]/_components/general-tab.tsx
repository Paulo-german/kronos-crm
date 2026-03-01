'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, AlertTriangleIcon, Clock } from 'lucide-react'
import { Button } from '@/_components/ui/button'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Badge } from '@/_components/ui/badge'
import { Label } from '@/_components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { updateAgent } from '@/_actions/agent/update-agent'
import { businessHoursConfigSchema } from '@/_actions/agent/update-agent/schema'
import {
  MODEL_OPTIONS,
  TOOL_OPTIONS,
  TIMEZONE_OPTIONS,
  DAY_LABELS,
  DAY_KEYS,
  DEFAULT_BUSINESS_HOURS_CONFIG,
} from './constants'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'

const generalTabSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio'),
  systemPrompt: z.string().min(1, 'Prompt não pode ser vazio'),
  isActive: z.boolean(),
  modelId: z.string(),
  debounceSeconds: z.number().int().min(0).max(30),
  pipelineIds: z.array(z.string().uuid()),
  toolsEnabled: z.array(z.string()),
  businessHoursEnabled: z.boolean(),
  businessHoursTimezone: z.string(),
  businessHoursConfig: businessHoursConfigSchema,
  outOfHoursMessage: z.string().nullable(),
})

type GeneralTabFormValues = z.infer<typeof generalTabSchema>

interface GeneralTabProps {
  agent: AgentDetailDto
  pipelines: OrgPipelineDto[]
  canManage: boolean
}

const GeneralTab = ({ agent, pipelines, canManage }: GeneralTabProps) => {
  const form = useForm<GeneralTabFormValues>({
    resolver: zodResolver(generalTabSchema),
    defaultValues: {
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      isActive: agent.isActive,
      modelId: agent.modelId,
      debounceSeconds: agent.debounceSeconds,
      pipelineIds: agent.pipelineIds,
      toolsEnabled: agent.toolsEnabled,
      businessHoursEnabled: agent.businessHoursEnabled,
      businessHoursTimezone: agent.businessHoursTimezone,
      businessHoursConfig: agent.businessHoursConfig ?? DEFAULT_BUSINESS_HOURS_CONFIG,
      outOfHoursMessage: agent.outOfHoursMessage,
    },
  })

  const { execute, isPending } = useAction(updateAgent, {
    onSuccess: () => {
      toast.success('Agente atualizado com sucesso!')
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar agente.')
    },
  })

  const onSubmit = (data: GeneralTabFormValues) => {
    execute({
      id: agent.id,
      ...data,
    })
  }

  const watchBusinessHoursEnabled = form.watch('businessHoursEnabled')
  const watchPipelineIds = form.watch('pipelineIds')
  const watchToolsEnabled = form.watch('toolsEnabled')

  const handleTogglePipeline = (pipelineId: string) => {
    const current = form.getValues('pipelineIds')
    const updated = current.includes(pipelineId)
      ? current.filter((id) => id !== pipelineId)
      : [...current, pipelineId]
    form.setValue('pipelineIds', updated, { shouldDirty: true })
  }

  const handleToggleTool = (toolValue: string) => {
    const current = form.getValues('toolsEnabled')
    const updated = current.includes(toolValue)
      ? current.filter((value) => value !== toolValue)
      : [...current, toolValue]
    form.setValue('toolsEnabled', updated, { shouldDirty: true })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Card 1 — Configurações Básicas */}
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Configurações Básicas</CardTitle>
            <CardDescription>
              Nome, prompt e status do agente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Prompt do Sistema</FormLabel>
                    <span className="text-xs text-muted-foreground">
                      {field.value.length} caracteres
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[200px] resize-y"
                      disabled={!canManage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canManage}
                    />
                  </FormControl>
                  <FormLabel>Agente ativo</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Card 2 — Modelo e Comportamento */}
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Modelo e Comportamento</CardTitle>
            <CardDescription>
              Modelo de IA e configurações de processamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
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
                      {MODEL_OPTIONS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debounceSeconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Debounce (segundos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={field.value}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                      disabled={!canManage}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Segundos de espera antes de processar mensagens agrupadas.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Card 3 — Pipelines Vinculados */}
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Pipelines Vinculados</CardTitle>
            <CardDescription>
              Pipelines em que o agente pode atuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipelines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pipeline disponível.
              </p>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" type="button">
                    {watchPipelineIds.length === 0
                      ? 'Selecionar pipelines...'
                      : `${watchPipelineIds.length} pipeline(s) selecionado(s)`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    {pipelines.map((pipeline) => (
                      <div
                        key={pipeline.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`pipeline-${pipeline.id}`}
                          checked={watchPipelineIds.includes(pipeline.id)}
                          onCheckedChange={() => handleTogglePipeline(pipeline.id)}
                          disabled={!canManage}
                        />
                        <Label
                          htmlFor={`pipeline-${pipeline.id}`}
                          className="cursor-pointer"
                        >
                          {pipeline.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {watchPipelineIds.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertTriangleIcon className="h-4 w-4" />
                <span>Agente não poderá mover negócios sem pipelines vinculados.</span>
              </div>
            )}

            {watchPipelineIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchPipelineIds.map((pipelineId) => {
                  const pipeline = pipelines.find(
                    (item) => item.id === pipelineId,
                  )
                  return pipeline ? (
                    <Badge key={pipelineId} variant="secondary">
                      {pipeline.name}
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4 — Ferramentas Habilitadas */}
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Ferramentas Habilitadas</CardTitle>
            <CardDescription>
              Ações que o agente pode executar durante conversas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TOOL_OPTIONS.map((tool) => (
                <div
                  key={tool.value}
                  className="flex items-start space-x-3 rounded-md border border-border/50 bg-background/70 p-3"
                >
                  <Checkbox
                    id={`tool-${tool.value}`}
                    checked={watchToolsEnabled.includes(tool.value)}
                    onCheckedChange={() => handleToggleTool(tool.value)}
                    disabled={!canManage}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={`tool-${tool.value}`}
                      className="cursor-pointer"
                    >
                      {tool.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card 5 — Horário de Funcionamento */}
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
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
                                disabled={!canManage || !form.watch(`businessHoursConfig.${dayKey}.enabled`)}
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
                                disabled={!canManage || !form.watch(`businessHoursConfig.${dayKey}.enabled`)}
                              />
                            </FormControl>
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
                        onChange={(event) => field.onChange(event.target.value || null)}
                        disabled={!canManage}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Se preenchida, será enviada automaticamente quando alguém enviar mensagem fora do horário.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          )}
        </Card>

        {/* Save Button */}
        {canManage && (
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  Salvando...
                </div>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

export default GeneralTab
