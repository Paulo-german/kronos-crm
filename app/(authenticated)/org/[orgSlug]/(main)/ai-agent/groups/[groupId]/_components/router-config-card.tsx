'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, PlusIcon, TrashIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/_components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Textarea } from '@/_components/ui/textarea'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { updateAgentGroup } from '@/_actions/agent-group/update-agent-group'
import {
  updateAgentGroupSchema,
  type UpdateAgentGroupInput,
} from '@/_actions/agent-group/update-agent-group/schema'
import type { AgentGroupDetailDto } from '@/_data-access/agent-group/get-agent-group-by-id'

// Modelos suportados pelo router (modelos leves, baixo custo)
const ROUTER_MODEL_OPTIONS = [
  { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash (recomendado)' },
  { value: 'google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash Preview' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
] as const

interface RouterConfigCardProps {
  group: AgentGroupDetailDto
}

export function RouterConfigCard({ group }: RouterConfigCardProps) {
  const form = useForm<UpdateAgentGroupInput>({
    resolver: zodResolver(updateAgentGroupSchema),
    defaultValues: {
      groupId: group.id,
      routerModelId: group.routerModelId,
      routerPrompt: group.routerPrompt ?? '',
      routerConfig: {
        fallbackAgentId: group.routerConfig?.fallbackAgentId ?? null,
        rules: group.routerConfig?.rules ?? [],
      },
    },
  })

  const { fields: ruleFields, append: appendRule, remove: removeRule } = useFieldArray({
    control: form.control,
    name: 'routerConfig.rules',
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(updateAgentGroup, {
    onSuccess: () => {
      toast.success('Configuração do router atualizada.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar configuração do router.')
    },
  })

  const onSubmit = (data: UpdateAgentGroupInput) => {
    // Converte string vazia para null para limpar o campo no banco
    executeUpdate({
      ...data,
      routerPrompt: data.routerPrompt || null,
    })
  }

  // Workers ativos disponíveis para seleção de fallback/regras (ambos os flags precisam ser true)
  const activeWorkers = group.members.filter((member) => member.isActive && member.agentIsActive)

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-base">Router</CardTitle>
        <CardDescription>
          Configure como o router classifica conversas e direciona para o agente correto.
          O router roda 24h, sem verificação de horário comercial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Modelo do router */}
            <FormField
              control={form.control}
              name="routerModelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo do router</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROUTER_MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Modelos mais leves têm menor custo por classificação.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Agente de fallback */}
            <FormField
              control={form.control}
              name="routerConfig.fallbackAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agente de fallback</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value ?? 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Automático (escolhe o mais genérico)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Automático (escolhe o mais genérico)</SelectItem>
                      {activeWorkers.map((worker) => (
                        <SelectItem key={worker.agentId} value={worker.agentId}>
                          {worker.agentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Worker padrão quando o router não tem certeza sobre a classificação.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prompt personalizado */}
            <FormField
              control={form.control}
              name="routerPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções adicionais (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instrua o router com contexto específico do seu negócio...&#10;Ex: Clientes que mencionam 'contrato' devem ser direcionados ao Agente Jurídico."
                      className="resize-none text-sm"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Instruções adicionadas ao prompt base do router. Útil para contexto de negócio específico.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Regras customizadas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Regras customizadas</p>
                  <p className="text-xs text-muted-foreground">
                    Forçam um worker específico quando palavras-chave são detectadas.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => appendRule({ agentId: '', keywords: [], description: '' })}
                >
                  <PlusIcon className="h-3 w-3" />
                  Adicionar regra
                </Button>
              </div>

              {ruleFields.length === 0 && (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Nenhuma regra configurada. O router usa apenas os escopos dos workers.
                </p>
              )}

              {ruleFields.map((ruleField, index) => (
                <div key={ruleField.id} className="rounded-md border border-border/50 bg-background/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Regra {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeRule(index)}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`routerConfig.rules.${index}.agentId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Worker alvo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o worker" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {group.members.map((worker) => (
                              <SelectItem key={worker.agentId} value={worker.agentId}>
                                {worker.agentName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`routerConfig.rules.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Descrição da regra (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Quando cliente mencionar problemas técnicos"
                            className="text-xs"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar router
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
