'use client'

import { useMemo, useState } from 'react'
import {
  BellOff,
  ChevronDown,
  Clock,
  Globe,
  ListChecks,
  Phone,
  Plus,
  User,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent } from '@/_components/ui/card'
import { Checkbox } from '@/_components/ui/checkbox'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import { cn } from '@/_lib/utils'
import { GLOBAL_TOOL_OPTIONS } from '../constants'
import type { GlobalTool } from '@/_actions/agent/shared/global-tool-schema'
import HandOffConfig from '../tool-config/hand-off-config'
import UpdateDealConfig from '../tool-config/update-deal-config'
import UpdateContactConfig from '../tool-config/update-contact-config'
import CreateTaskConfig from '../tool-config/create-task-config'

interface StepOption {
  id: string
  name: string
  order: number
}

interface GlobalToolBuilderProps {
  value: GlobalTool[]
  onChange: (tools: GlobalTool[]) => void
  steps?: StepOption[]
}

const TRIGGER_PLACEHOLDERS: Record<string, string> = {
  update_contact: 'Ex: Ao coletar dados do contato',
  update_deal: 'Ex: Ao coletar informações do negócio',
  create_task: 'Ex: Ao identificar necessidade de follow-up',
  hand_off_to_human: 'Ex: Se necessário atendimento humano',
}

const DEAL_FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  value: 'Valor',
  priority: 'Prioridade',
  expectedCloseDate: 'Prev. fechamento',
  notes: 'Notas',
}

const buildDefaultGlobalTool = (type: string): GlobalTool => {
  switch (type) {
    case 'hand_off_to_human':
      return { type: 'hand_off_to_human', trigger: '', notifyTarget: 'none', scope: 'global', stepIds: [] }
    case 'update_contact':
      return { type: 'update_contact', trigger: '', scope: 'global', stepIds: [] }
    case 'update_deal':
      return { type: 'update_deal', trigger: '', allowedFields: [], scope: 'global', stepIds: [] }
    case 'create_task':
      return { type: 'create_task', trigger: '', title: '', scope: 'global', stepIds: [] }
    default:
      return { type: 'update_contact', trigger: '', scope: 'global', stepIds: [] }
  }
}

interface ToolSummary {
  trigger: string | null
  config: React.ReactNode
}

const InfoPiece = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <span className="inline-flex items-center gap-0.5">
    <Icon className="h-3 w-3 shrink-0" />
    {text}
  </span>
)

const Dot = () => <span className="text-muted-foreground/40">·</span>

const getToolSummary = (tool: GlobalTool): ToolSummary => {
  const trigger = tool.trigger || null

  switch (tool.type) {
    case 'update_contact':
      return { trigger, config: 'Sem configuração adicional' }
    case 'update_deal': {
      const fields = tool.allowedFields ?? []
      if (fields.length === 0) return { trigger, config: 'Nenhum campo selecionado' }
      return { trigger, config: fields.map((field) => DEAL_FIELD_LABELS[field] ?? field).join(', ') }
    }
    case 'create_task': {
      if (!tool.title) return { trigger, config: 'Título não definido' }
      return {
        trigger,
        config: (
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>&ldquo;{tool.title}&rdquo;</span>
            {tool.dueDaysOffset && (
              <>
                <Dot />
                <InfoPiece icon={Clock} text={`${tool.dueDaysOffset} dias`} />
              </>
            )}
          </span>
        ),
      }
    }
    case 'hand_off_to_human': {
      if (tool.notifyTarget === 'specific_number') {
        return {
          trigger,
          config: <InfoPiece icon={Phone} text={tool.specificPhone ?? 'Número não definido'} />,
        }
      }
      if (tool.notifyTarget === 'deal_assignee') {
        return { trigger, config: <InfoPiece icon={User} text="Responsável pelo negócio" /> }
      }
      return { trigger, config: <InfoPiece icon={BellOff} text="Sem notificação" /> }
    }
  }
}

const GlobalToolBuilder = ({ value, onChange, steps = [] }: GlobalToolBuilderProps) => {
  // Indexado por id de instância (não por type) para permitir abrir/fechar
  // cards individuais quando há múltiplas instâncias do mesmo type.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Backfill defensivo: itens vindos do servidor sem id recebem um id local
  // para uso como React key. Não chamamos onChange — o backend normalizará no
  // próximo save. O useMemo garante ids estáveis entre re-renders.
  const valueWithIds = useMemo(
    () =>
      value.map((tool) =>
        tool.id ? tool : { ...tool, id: crypto.randomUUID() },
      ),
    [value],
  )

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const addTool = (type: string) => {
    const newTool = { id: crypto.randomUUID(), ...buildDefaultGlobalTool(type) }
    onChange([...value, newTool])
    setExpandedIds((prev) => new Set([...prev, newTool.id!]))
  }

  const removeTool = (id: string) => {
    onChange(value.filter((tool) => tool.id !== id))
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const updateTool = (id: string, updates: Record<string, unknown>) => {
    onChange(
      value.map((tool) =>
        tool.id === id ? ({ ...tool, ...updates } as GlobalTool) : tool,
      ),
    )
  }

  // Permite adicionar qualquer ferramenta global sem restrição de duplicata (multi-instância).
  const availableToAdd = GLOBAL_TOOL_OPTIONS

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {valueWithIds.map((tool, index) => {
          const toolOption = GLOBAL_TOOL_OPTIONS.find((opt) => opt.value === tool.type)
          const toolId = tool.id!
          const isOpen = expandedIds.has(toolId)
          const summary = getToolSummary(tool)

          // Badge de índice (#1, #2) aparece somente quando há mais de uma
          // instância do mesmo type, para distinguir visualmente as instâncias.
          const sameTypeCount = valueWithIds.filter((item) => item.type === tool.type).length
          const instanceIndex = valueWithIds.slice(0, index).filter((item) => item.type === tool.type).length
          const showInstanceBadge = sameTypeCount > 1

          return (
            <Collapsible
              key={toolId}
              open={isOpen}
              onOpenChange={() => toggle(toolId)}
            >
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-0">
                  <div className="flex items-center pr-2">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="block text-sm font-medium">
                              {toolOption?.label ?? tool.type}
                            </span>
                            {showInstanceBadge && (
                              <Badge
                                variant="secondary"
                                className="h-4 px-1.5 text-[10px] font-medium"
                              >
                                #{instanceIndex + 1}
                              </Badge>
                            )}
                          </div>
                          {!isOpen && (
                            <span className="flex flex-col gap-0.5 text-xs text-muted-foreground/70">
                              {summary.trigger && (
                                <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
                                  <Zap className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{summary.trigger}</span>
                                </span>
                              )}
                              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                {summary.config}
                              </span>
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTool(toolId)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <div className="space-y-3 border-t px-4 pb-4 pt-4">
                      {toolOption?.description && (
                        <p className="text-xs text-muted-foreground">
                          {toolOption.description}
                        </p>
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-xs">Quando executar</Label>
                        <Input
                          placeholder={TRIGGER_PLACEHOLDERS[tool.type]}
                          value={tool.trigger}
                          onChange={(event) =>
                            updateTool(toolId, { trigger: event.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Disponibilidade</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateTool(toolId, { scope: 'global', stepIds: [] })}
                            className={cn(
                              'flex flex-1 gap-1.5 text-xs',
                              (tool.scope ?? 'global') === 'global'
                                ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                                : 'text-muted-foreground',
                            )}
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Todas as etapas
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateTool(toolId, { scope: 'steps' })}
                            className={cn(
                              'flex flex-1 gap-1.5 text-xs',
                              tool.scope === 'steps'
                                ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                                : 'text-muted-foreground',
                            )}
                          >
                            <ListChecks className="h-3.5 w-3.5" />
                            Etapas específicas
                          </Button>
                        </div>
                      </div>

                      {tool.scope === 'steps' && steps.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Etapas</Label>
                          <div className="space-y-1.5 rounded-md border p-3">
                            {steps
                              .slice()
                              .sort((stepA, stepB) => stepA.order - stepB.order)
                              .map((step) => {
                                const checked = (tool.stepIds ?? []).includes(step.id)
                                return (
                                  <div key={step.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`${toolId}-step-${step.id}`}
                                      checked={checked}
                                      onCheckedChange={(isChecked) => {
                                        const current = tool.stepIds ?? []
                                        const next = isChecked
                                          ? [...current, step.id]
                                          : current.filter((sid) => sid !== step.id)
                                        updateTool(toolId, { stepIds: next })
                                      }}
                                    />
                                    <Label
                                      htmlFor={`${toolId}-step-${step.id}`}
                                      className="cursor-pointer text-xs font-normal"
                                    >
                                      {step.order + 1}. {step.name}
                                    </Label>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {tool.scope === 'steps' && steps.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma etapa configurada neste agente.
                        </p>
                      )}

                      {tool.type === 'hand_off_to_human' && (
                        <HandOffConfig
                          notifyTarget={tool.notifyTarget}
                          specificPhone={tool.specificPhone}
                          notificationMessage={tool.notificationMessage}
                          onNotifyTargetChange={(val) =>
                            updateTool(toolId, {
                              notifyTarget: val,
                              ...(val === 'none'
                                ? { specificPhone: undefined, notificationMessage: undefined }
                                : {}),
                              ...(val === 'deal_assignee'
                                ? { specificPhone: undefined }
                                : {}),
                            })
                          }
                          onSpecificPhoneChange={(val) =>
                            updateTool(toolId, { specificPhone: val })
                          }
                          onNotificationMessageChange={(val) =>
                            updateTool(toolId, { notificationMessage: val })
                          }
                        />
                      )}

                      {tool.type === 'update_contact' && <UpdateContactConfig />}

                      {tool.type === 'update_deal' && (
                        <UpdateDealConfig
                          actionType={tool.type}
                          allowedFields={tool.allowedFields ?? []}
                          fixedPriority={tool.fixedPriority}
                          notesTemplate={tool.notesTemplate}
                          onAllowedFieldsChange={(fields, extra) =>
                            updateTool(toolId, { allowedFields: fields, ...extra })
                          }
                          onFixedPriorityChange={(val) =>
                            updateTool(toolId, { fixedPriority: val as 'low' | 'medium' | 'high' | 'urgent' | undefined })
                          }
                          onNotesTemplateChange={(val) =>
                            updateTool(toolId, { notesTemplate: val })
                          }
                        />
                      )}

                      {tool.type === 'create_task' && (
                        <CreateTaskConfig
                          title={tool.title}
                          dueDaysOffset={tool.dueDaysOffset}
                          onTitleChange={(val) => updateTool(toolId, { title: val })}
                          onDueDaysOffsetChange={(val) =>
                            updateTool(toolId, { dueDaysOffset: val })
                          }
                        />
                      )}
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" type="button">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Ferramenta
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {availableToAdd.map((option) => (
            <DropdownMenuItem key={option.value} onClick={() => addTool(option.value)}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default GlobalToolBuilder
