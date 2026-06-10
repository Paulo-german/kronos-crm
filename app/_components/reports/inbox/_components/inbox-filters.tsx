'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { MessageSquare, Tag, CheckCircle2, Bot, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { ConversationLabelDto } from '@/_data-access/conversation-label/get-conversation-labels'

// Parsers nuqs — apenas filtros NÃO cobertos pelo shell global (start/end/assignee)
const inboxReportFiltersParsers = {
  channel: parseAsString.withOptions({ shallow: false }),
  labelId: parseAsString.withOptions({ shallow: false }),
  inboxStatus: parseAsString.withOptions({ shallow: false }),
  aiVsHuman: parseAsString.withOptions({ shallow: false }),
}

const CHANNEL_OPTIONS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WEB_CHAT', label: 'Web Chat' },
] as const

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'RESOLVED', label: 'Resolvido' },
] as const

const AI_HUMAN_OPTIONS = [
  { value: 'ai', label: 'IA' },
  { value: 'human', label: 'Humano' },
] as const

interface InboxFiltersProps {
  labels: ConversationLabelDto[]
}

interface ActiveFilterBadgeProps {
  label: string
  onRemove: () => void
}

function ActiveFilterBadge({ label, onRemove }: ActiveFilterBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
    >
      {label}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="ml-0.5 size-4 rounded-sm p-0 opacity-60 hover:bg-transparent hover:opacity-100"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="size-3" />
      </Button>
    </Badge>
  )
}

interface LabelTriggerContentProps {
  labels: ConversationLabelDto[]
  selectedId: string
}

function LabelTriggerContent({ labels, selectedId }: LabelTriggerContentProps) {
  const label = labels.find((entry) => entry.id === selectedId)
  if (!label) return null
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      <span className="max-w-[100px] truncate">{label.name}</span>
    </div>
  )
}

export function InboxFilters({ labels }: InboxFiltersProps) {
  const [filters, setFilters] = useQueryStates(inboxReportFiltersParsers)

  const hasActiveFilters =
    !!filters.channel ||
    !!filters.labelId ||
    !!filters.inboxStatus ||
    !!filters.aiVsHuman

  function clearAllFilters() {
    void setFilters({
      channel: null,
      labelId: null,
      inboxStatus: null,
      aiVsHuman: null,
    })
  }

  const activeFilterBadges: Array<{ key: string; label: string }> = []

  if (filters.channel) {
    const option = CHANNEL_OPTIONS.find(
      (option) => option.value === filters.channel,
    )
    if (option) activeFilterBadges.push({ key: 'channel', label: option.label })
  }
  if (filters.labelId) {
    const selectedLabel = labels.find((label) => label.id === filters.labelId)
    if (selectedLabel)
      activeFilterBadges.push({ key: 'labelId', label: selectedLabel.name })
  }
  if (filters.inboxStatus) {
    const option = STATUS_OPTIONS.find(
      (option) => option.value === filters.inboxStatus,
    )
    if (option)
      activeFilterBadges.push({ key: 'inboxStatus', label: option.label })
  }
  if (filters.aiVsHuman) {
    const option = AI_HUMAN_OPTIONS.find(
      (option) => option.value === filters.aiVsHuman,
    )
    if (option)
      activeFilterBadges.push({ key: 'aiVsHuman', label: option.label })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Canal */}
        <Select
          value={filters.channel ?? 'all'}
          onValueChange={(value) =>
            void setFilters({ channel: value === 'all' ? null : value })
          }
        >
          <SelectTrigger
            className={cn(
              'h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium',
              filters.channel && 'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            <MessageSquare className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            <SelectSeparator />
            {CHANNEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Etiqueta */}
        {labels.length > 0 && (
          <Select
            value={filters.labelId ?? 'all'}
            onValueChange={(value) =>
              void setFilters({ labelId: value === 'all' ? null : value })
            }
          >
            <SelectTrigger
              className={cn(
                'h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium',
                filters.labelId &&
                  'border-primary/40 bg-primary/5 text-primary',
              )}
            >
              <Tag className="size-3.5 text-muted-foreground" />
              {filters.labelId ? (
                <LabelTriggerContent
                  labels={labels}
                  selectedId={filters.labelId}
                />
              ) : (
                <SelectValue placeholder="Etiqueta" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etiquetas</SelectItem>
              <SelectSeparator />
              {labels.map((label) => (
                <SelectItem key={label.id} value={label.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span>{label.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status */}
        <Select
          value={filters.inboxStatus ?? 'all'}
          onValueChange={(value) =>
            void setFilters({ inboxStatus: value === 'all' ? null : value })
          }
        >
          <SelectTrigger
            className={cn(
              'h-8 w-auto min-w-[120px] gap-1.5 border px-2.5 text-xs font-medium',
              filters.inboxStatus &&
                'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            <CheckCircle2 className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectSeparator />
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* IA vs Humano */}
        <Select
          value={filters.aiVsHuman ?? 'all'}
          onValueChange={(value) =>
            void setFilters({ aiVsHuman: value === 'all' ? null : value })
          }
        >
          <SelectTrigger
            className={cn(
              'h-8 w-auto min-w-[120px] gap-1.5 border px-2.5 text-xs font-medium',
              filters.aiVsHuman &&
                'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            <Bot className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="IA / Humano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">IA e Humano</SelectItem>
            <SelectSeparator />
            {AI_HUMAN_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {activeFilterBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterBadges.map((badge) => (
            <ActiveFilterBadge
              key={badge.key}
              label={badge.label}
              onRemove={() => void setFilters({ [badge.key]: null })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
