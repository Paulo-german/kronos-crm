'use client'

import { useState } from 'react'
import {
  BellOff,
  ChevronDown,
  Clock,
  Phone,
  Plus,
  User,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
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

interface GlobalToolBuilderProps {
  value: GlobalTool[]
  onChange: (tools: GlobalTool[]) => void
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
      return { type: 'hand_off_to_human', trigger: '', notifyTarget: 'none' }
    case 'update_contact':
      return { type: 'update_contact', trigger: '' }
    case 'update_deal':
      return { type: 'update_deal', trigger: '', allowedFields: [], allowedStatuses: [] }
    case 'create_task':
      return { type: 'create_task', trigger: '', title: '' }
    default:
      return { type: 'update_contact', trigger: '' }
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

const GlobalToolBuilder = ({ value, onChange }: GlobalToolBuilderProps) => {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())

  const toggle = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const addTool = (type: string) => {
    onChange([...value, buildDefaultGlobalTool(type)])
    setExpandedTypes((prev) => new Set([...prev, type]))
  }

  const removeTool = (type: string) => {
    onChange(value.filter((tool) => tool.type !== type))
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      next.delete(type)
      return next
    })
  }

  const updateTool = (type: string, updates: Record<string, unknown>) => {
    onChange(
      value.map((tool) =>
        tool.type === type ? ({ ...tool, ...updates } as GlobalTool) : tool,
      ),
    )
  }

  const availableToAdd = GLOBAL_TOOL_OPTIONS.filter(
    (option) => !value.some((tool) => tool.type === option.value),
  )

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {value.map((tool) => {
          const toolOption = GLOBAL_TOOL_OPTIONS.find((opt) => opt.value === tool.type)
          const isOpen = expandedTypes.has(tool.type)
          const summary = getToolSummary(tool)

          return (
            <Collapsible
              key={tool.type}
              open={isOpen}
              onOpenChange={() => toggle(tool.type)}
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
                          <span className="block text-sm font-medium">
                            {toolOption?.label ?? tool.type}
                          </span>
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
                      onClick={() => removeTool(tool.type)}
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
                            updateTool(tool.type, { trigger: event.target.value })
                          }
                        />
                      </div>

                      {tool.type === 'hand_off_to_human' && (
                        <HandOffConfig
                          notifyTarget={tool.notifyTarget}
                          specificPhone={tool.specificPhone}
                          notificationMessage={tool.notificationMessage}
                          onNotifyTargetChange={(val) =>
                            updateTool('hand_off_to_human', {
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
                            updateTool('hand_off_to_human', { specificPhone: val })
                          }
                          onNotificationMessageChange={(val) =>
                            updateTool('hand_off_to_human', { notificationMessage: val })
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
                          allowedStatuses={tool.allowedStatuses ?? []}
                          onAllowedFieldsChange={(fields, extra) =>
                            updateTool('update_deal', { allowedFields: fields, ...extra })
                          }
                          onFixedPriorityChange={(val) =>
                            updateTool('update_deal', { fixedPriority: val as 'low' | 'medium' | 'high' | 'urgent' | undefined })
                          }
                          onNotesTemplateChange={(val) =>
                            updateTool('update_deal', { notesTemplate: val })
                          }
                          onAllowedStatusesChange={(statuses) =>
                            updateTool('update_deal', { allowedStatuses: statuses })
                          }
                        />
                      )}

                      {tool.type === 'create_task' && (
                        <CreateTaskConfig
                          title={tool.title}
                          dueDaysOffset={tool.dueDaysOffset}
                          onTitleChange={(val) => updateTool('create_task', { title: val })}
                          onDueDaysOffsetChange={(val) =>
                            updateTool('create_task', { dueDaysOffset: val })
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

      {availableToAdd.length > 0 && (
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
      )}
    </div>
  )
}

export default GlobalToolBuilder
