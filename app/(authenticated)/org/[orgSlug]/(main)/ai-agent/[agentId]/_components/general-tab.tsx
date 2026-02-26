'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
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
import { updateAgent } from '@/_actions/agent/update-agent'
import { MODEL_OPTIONS, TOOL_OPTIONS } from './constants'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'

interface GeneralTabProps {
  agent: AgentDetailDto
  pipelines: OrgPipelineDto[]
  canManage: boolean
}

const GeneralTab = ({ agent, pipelines, canManage }: GeneralTabProps) => {
  const [name, setName] = useState(agent.name)
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt)
  const [isActive, setIsActive] = useState(agent.isActive)
  const [modelId, setModelId] = useState(agent.modelId)
  const [debounceSeconds, setDebounceSeconds] = useState(agent.debounceSeconds)
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>(
    agent.pipelineIds,
  )
  const [selectedTools, setSelectedTools] = useState<string[]>(
    agent.toolsEnabled,
  )

  const { execute, isPending } = useAction(updateAgent, {
    onSuccess: () => {
      toast.success('Agente atualizado com sucesso!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar agente.')
    },
  })

  const handleSave = () => {
    execute({
      id: agent.id,
      name,
      systemPrompt,
      isActive,
      modelId,
      debounceSeconds,
      pipelineIds: selectedPipelineIds,
      toolsEnabled: selectedTools,
    })
  }

  const handleTogglePipeline = (pipelineId: string) => {
    setSelectedPipelineIds((prev) =>
      prev.includes(pipelineId)
        ? prev.filter((id) => id !== pipelineId)
        : [...prev, pipelineId],
    )
  }

  const handleToggleTool = (toolValue: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolValue)
        ? prev.filter((value) => value !== toolValue)
        : [...prev, toolValue],
    )
  }

  return (
    <div className="space-y-6">
      {/* Card 1 — Configurações Básicas */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Configurações Básicas</CardTitle>
          <CardDescription>
            Nome, prompt e status do agente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Nome</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canManage}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="agent-prompt">Prompt do Sistema</Label>
              <span className="text-xs text-muted-foreground">
                {systemPrompt.length} caracteres
              </span>
            </div>
            <Textarea
              id="agent-prompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              className="min-h-[200px] resize-y"
              disabled={!canManage}
            />
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="agent-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={!canManage}
            />
            <Label htmlFor="agent-active">Agente ativo</Label>
          </div>
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
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select
              value={modelId}
              onValueChange={setModelId}
              disabled={!canManage}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="debounce">Debounce (segundos)</Label>
            <Input
              id="debounce"
              type="number"
              min={0}
              max={30}
              value={debounceSeconds}
              onChange={(event) =>
                setDebounceSeconds(Number(event.target.value))
              }
              disabled={!canManage}
            />
            <p className="text-xs text-muted-foreground">
              Segundos de espera antes de processar mensagens agrupadas.
            </p>
          </div>
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
                <Button variant="outline" className="w-full justify-start">
                  {selectedPipelineIds.length === 0
                    ? 'Selecionar pipelines...'
                    : `${selectedPipelineIds.length} pipeline(s) selecionado(s)`}
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
                        checked={selectedPipelineIds.includes(pipeline.id)}
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

          {selectedPipelineIds.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangleIcon className="h-4 w-4" />
              <span>Agente não poderá mover negócios sem pipelines vinculados.</span>
            </div>
          )}

          {selectedPipelineIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedPipelineIds.map((pipelineId) => {
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
                  checked={selectedTools.includes(tool.value)}
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

      {/* Save Button */}
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
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
    </div>
  )
}

export default GeneralTab
