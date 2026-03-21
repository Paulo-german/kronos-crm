'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { triggerConfigGeneration } from '@/_actions/onboarding/trigger-config-generation'
import { useTaskPolling } from '../_hooks/use-task-polling'
import { PipelineStagesEditor } from './pipeline-stages-editor'
import { EditableStringList } from './editable-string-list'
import { GenerationLoadingCard } from './generation-loading-card'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { ConfigBundle } from '@/_lib/onboarding/schemas/config-bundle'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

const LS_CONFIG_TASK_ID = 'kronos_onb_config_task_id'
const LS_CONFIG_BUNDLE = 'kronos_onb_config_bundle'

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const

type DayKey = (typeof DAYS_OF_WEEK)[number]['key']

interface ConfigReviewStepProps {
  businessProfile: BusinessProfile
  initialConfigBundle: ConfigBundle | null
  onComplete: (configBundle: ConfigBundle) => void
  onBack: () => void
}

export function ConfigReviewStep({
  businessProfile,
  initialConfigBundle,
  onComplete,
  onBack,
}: ConfigReviewStepProps) {
  const [configBundle, setConfigBundle] = useState<ConfigBundle | null>(
    initialConfigBundle,
  )
  const [taskError, setTaskError] = useState<string | null>(null)

  const { status, output, isPolling, error: pollError, startPolling } = useTaskPolling()

  const { execute: executeTrigger, isPending: isTriggeringGeneration } = useAction(
    triggerConfigGeneration,
    {
      onSuccess: ({ data }) => {
        if (!data) return
        // Persiste taskId no localStorage
        localStorage.setItem(LS_CONFIG_TASK_ID, data.taskId)
        startPolling(data.taskId)
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError ?? 'Erro ao iniciar geração de configuração.',
        )
        setTaskError(error.serverError ?? 'Erro ao iniciar geração.')
      },
    },
  )

  const hasTriggeredRef = useRef(false)

  // Na montagem: verificar se ja tem dados ou disparar geracao
  useEffect(() => {
    if (hasTriggeredRef.current) return

    // Se ja tem bundle (voltou do step 2), usar diretamente
    if (initialConfigBundle) {
      setConfigBundle(initialConfigBundle)
      hasTriggeredRef.current = true
      return
    }

    // Verificar se tem task em andamento no localStorage
    const savedTaskId = localStorage.getItem(LS_CONFIG_TASK_ID)
    const savedBundle = localStorage.getItem(LS_CONFIG_BUNDLE)

    if (savedBundle && !savedTaskId) {
      try {
        const parsed = JSON.parse(savedBundle) as ConfigBundle
        setConfigBundle(parsed)
        hasTriggeredRef.current = true
        return
      } catch {
        // Bundle invalido, disparar nova geracao
      }
    }

    if (savedTaskId) {
      hasTriggeredRef.current = true
      startPolling(savedTaskId)
      return
    }

    // Disparar nova geracao
    hasTriggeredRef.current = true
    executeTrigger({ businessProfile })
  }, [businessProfile, initialConfigBundle, executeTrigger, startPolling])

  // Quando polling completar, extrair bundle
  useEffect(() => {
    if (status === 'COMPLETED' && output) {
      const bundle = output as ConfigBundle
      setConfigBundle(bundle)
      localStorage.setItem(LS_CONFIG_BUNDLE, JSON.stringify(bundle))
      localStorage.removeItem(LS_CONFIG_TASK_ID)
    }

    if (pollError) {
      setTaskError(pollError)
      localStorage.removeItem(LS_CONFIG_TASK_ID)
      toast.error(pollError)
    }
  }, [status, output, pollError])

  const handleRegenerate = useCallback(() => {
    setConfigBundle(null)
    setTaskError(null)
    localStorage.removeItem(LS_CONFIG_TASK_ID)
    localStorage.removeItem(LS_CONFIG_BUNDLE)
    hasTriggeredRef.current = false
    executeTrigger({ businessProfile })
  }, [businessProfile, executeTrigger])

  const handleConfirm = useCallback(() => {
    if (!configBundle) return
    localStorage.setItem(LS_CONFIG_BUNDLE, JSON.stringify(configBundle))
    toast.success('Configuração aprovada!')
    onComplete(configBundle)
  }, [configBundle, onComplete])

  // Helpers para atualizar partes do configBundle
  const updateStages = useCallback(
    (stages: ConfigBundle['pipelineStages']) => {
      setConfigBundle((prev) => (prev ? { ...prev, pipelineStages: stages } : prev))
    },
    [],
  )

  const updatePromptConfig = useCallback(
    (field: keyof ConfigBundle['promptConfig'], value: unknown) => {
      setConfigBundle((prev) =>
        prev
          ? {
              ...prev,
              promptConfig: { ...prev.promptConfig, [field]: value },
            }
          : prev,
      )
    },
    [],
  )

  const updateBusinessHoursDay = useCallback(
    (day: DayKey, field: 'enabled' | 'start' | 'end', value: string | boolean) => {
      setConfigBundle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          businessHoursConfig: {
            ...prev.businessHoursConfig,
            [day]: {
              ...prev.businessHoursConfig[day],
              [field]: value,
            },
          } as BusinessHoursConfig,
        }
      })
    },
    [],
  )

  const isGenerating = isPolling || isTriggeringGeneration || (!configBundle && !taskError)

  // Estado: Erro
  if (taskError && !configBundle) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-8 py-12 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <div>
            <p className="font-semibold">Falha na geração</p>
            <p className="mt-1 text-sm text-muted-foreground">{taskError}</p>
          </div>
          <Button onClick={handleRegenerate} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>
        </div>
        <div className="mt-4">
          <Button variant="ghost" onClick={onBack} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  // Estado: Gerando
  if (isGenerating) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Gerando configuração personalizada para{' '}
            <strong>{businessProfile.companyName}</strong>...
          </p>
        </div>
        <GenerationLoadingCard
          title="Configurando pipeline de vendas"
          description="Criando stages personalizados para o seu processo comercial..."
        />
        <GenerationLoadingCard
          title="Configurando atendimento"
          description="Definindo tom, diretrizes e restrições do atendimento..."
        />
        <GenerationLoadingCard
          title="Definindo motivos de perda"
          description="Mapeando os principais motivos de perda para o seu negócio..."
        />
      </div>
    )
  }

  if (!configBundle) return null

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Revisione e ajuste a configuração gerada para{' '}
          <strong>{businessProfile.companyName}</strong>.
        </p>
      </div>

      {/* Secao 1: Pipeline Stages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funil de Vendas</CardTitle>
          <CardDescription>
            Arraste para reordenar. Clique na cor para alterar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineStagesEditor
            stages={configBundle.pipelineStages}
            onChange={updateStages}
          />
        </CardContent>
      </Card>

      {/* Secao 2: Configuracao do Atendimento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuração do Atendimento</CardTitle>
          <CardDescription>
            Defina como o agente se comportará nas conversas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Role */}
            <div className="space-y-1.5">
              <Label>Papel do agente</Label>
              <Select
                value={configBundle.promptConfig.role}
                onValueChange={(value) =>
                  updatePromptConfig(
                    'role',
                    value as ConfigBundle['promptConfig']['role'],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdr">SDR (Prospecção)</SelectItem>
                  <SelectItem value="closer">Closer (Fechamento)</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="receptionist">Recepcionista</SelectItem>
                  <SelectItem value="custom">Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tom */}
            <div className="space-y-1.5">
              <Label>Tom de comunicação</Label>
              <Select
                value={configBundle.promptConfig.tone}
                onValueChange={(value) =>
                  updatePromptConfig(
                    'tone',
                    value as ConfigBundle['promptConfig']['tone'],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="friendly">Amigável</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tamanho da resposta */}
            <div className="space-y-1.5">
              <Label>Tamanho das respostas</Label>
              <Select
                value={configBundle.promptConfig.responseLength}
                onValueChange={(value) =>
                  updatePromptConfig(
                    'responseLength',
                    value as ConfigBundle['promptConfig']['responseLength'],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Curta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="detailed">Detalhada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Idioma */}
            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Select
                value={configBundle.promptConfig.language}
                onValueChange={(value) =>
                  updatePromptConfig(
                    'language',
                    value as ConfigBundle['promptConfig']['language'],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="auto">Automático</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Emojis */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Usar emojis</p>
              <p className="text-xs text-muted-foreground">
                O agente incluirá emojis nas mensagens
              </p>
            </div>
            <Switch
              checked={configBundle.promptConfig.useEmojis}
              onCheckedChange={(checked) => updatePromptConfig('useEmojis', checked)}
            />
          </div>

          {/* Publico-alvo */}
          <div className="space-y-1.5">
            <Label>Público-alvo</Label>
            <Textarea
              value={configBundle.promptConfig.targetAudience}
              onChange={(event) =>
                updatePromptConfig('targetAudience', event.target.value)
              }
              rows={2}
              placeholder="Descreva o público que o agente vai atender..."
            />
          </div>

          {/* Diretrizes */}
          <div className="space-y-1.5">
            <Label>Diretrizes de atendimento</Label>
            <p className="text-xs text-muted-foreground">
              O que o agente deve fazer (mín. 3, máx. 10)
            </p>
            <EditableStringList
              value={configBundle.promptConfig.guidelines}
              onChange={(value) => updatePromptConfig('guidelines', value)}
              placeholder="Ex: Sempre perguntar o nome do cliente..."
              maxItems={10}
              addLabel="Adicionar diretriz"
            />
          </div>

          {/* Restricoes */}
          <div className="space-y-1.5">
            <Label>Restrições</Label>
            <p className="text-xs text-muted-foreground">
              O que o agente NÃO deve fazer (mín. 2, máx. 8)
            </p>
            <EditableStringList
              value={configBundle.promptConfig.restrictions}
              onChange={(value) => updatePromptConfig('restrictions', value)}
              placeholder="Ex: Nunca mencionar preços de concorrentes..."
              maxItems={8}
              addLabel="Adicionar restrição"
            />
          </div>
        </CardContent>
      </Card>

      {/* Secao 3: Motivos de Perda */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Motivos de Perda</CardTitle>
          <CardDescription>
            Motivos para registrar quando um negócio é perdido (mín. 4, máx. 8).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditableStringList
            value={configBundle.lostReasons}
            onChange={(value) =>
              setConfigBundle((prev) => (prev ? { ...prev, lostReasons: value } : prev))
            }
            placeholder="Ex: Preço acima do mercado..."
            maxItems={8}
            addLabel="Adicionar motivo"
          />
        </CardContent>
      </Card>

      {/* Secao 4: Horario de Atendimento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Horário de Atendimento</CardTitle>
          <CardDescription>
            Configure quando o agente responde automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Ativar controle de horário</p>
              <p className="text-xs text-muted-foreground">
                O agente só responde nos horários configurados
              </p>
            </div>
            <Switch
              checked={configBundle.businessHoursEnabled}
              onCheckedChange={(checked) =>
                setConfigBundle((prev) =>
                  prev ? { ...prev, businessHoursEnabled: checked } : prev,
                )
              }
            />
          </div>

          {configBundle.businessHoursEnabled && (
            <div className="space-y-2">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const dayConfig = configBundle.businessHoursConfig[key]
                return (
                  <div
                    key={key}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <Switch
                      checked={dayConfig.enabled}
                      onCheckedChange={(checked) =>
                        updateBusinessHoursDay(key, 'enabled', checked)
                      }
                    />
                    <Input
                      type="time"
                      value={dayConfig.start}
                      onChange={(event) =>
                        updateBusinessHoursDay(key, 'start', event.target.value)
                      }
                      disabled={!dayConfig.enabled}
                      className="h-8 w-24 text-xs"
                    />
                    <Input
                      type="time"
                      value={dayConfig.end}
                      onChange={(event) =>
                        updateBusinessHoursDay(key, 'end', event.target.value)
                      }
                      disabled={!dayConfig.enabled}
                      className="h-8 w-24 text-xs"
                    />
                  </div>
                )
              })}

              <div className="space-y-1.5 pt-2">
                <Label>Mensagem fora do horário</Label>
                <Textarea
                  value={configBundle.outOfHoursMessage}
                  onChange={(event) =>
                    setConfigBundle((prev) =>
                      prev
                        ? { ...prev, outOfHoursMessage: event.target.value }
                        : prev,
                    )
                  }
                  rows={2}
                  placeholder="Ex: Olá! No momento estamos fora do horário de atendimento..."
                />
              </div>
            </div>
          )}

          {!configBundle.businessHoursEnabled && (
            <div className="space-y-1.5">
              <Label>Mensagem fora do horário</Label>
              <Textarea
                value={configBundle.outOfHoursMessage}
                onChange={(event) =>
                  setConfigBundle((prev) =>
                    prev
                      ? { ...prev, outOfHoursMessage: event.target.value }
                      : prev,
                  )
                }
                rows={2}
                placeholder="Ex: Olá! No momento estamos fora do horário de atendimento..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botoes */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={isTriggeringGeneration || isPolling}
            className="gap-2"
          >
            {isTriggeringGeneration || isPolling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Regenerar
          </Button>

          <Button onClick={handleConfirm} className="gap-2">
            Confirmar e Continuar
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
