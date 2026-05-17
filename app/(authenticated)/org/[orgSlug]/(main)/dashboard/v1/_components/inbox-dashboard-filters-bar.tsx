'use client'

import * as React from 'react'
import { parseAsString, useQueryStates } from 'nuqs'
import {
  MessageSquare,
  Users,
  Tag,
  CheckCircle2,
  Bot,
  X,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ConversationLabelDto } from '@/_data-access/conversation-label/get-conversation-labels'

// --- Parsers nuqs com shallow: false para forçar re-render server-side ---
const inboxFiltersParsers = {
  channel: parseAsString.withOptions({ shallow: false }),
  assignee: parseAsString.withOptions({ shallow: false }),
  labelId: parseAsString.withOptions({ shallow: false }),
  inboxStatus: parseAsString.withOptions({ shallow: false }),
  aiVsHuman: parseAsString.withOptions({ shallow: false }),
}

// --- Opções de canal ---
const CHANNEL_OPTIONS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WEB_CHAT', label: 'Web Chat' },
] as const

// --- Opções de status ---
const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'RESOLVED', label: 'Resolvido' },
] as const

// --- Opções de IA vs Humano ---
const AI_HUMAN_OPTIONS = [
  { value: 'ai', label: 'IA' },
  { value: 'human', label: 'Humano' },
] as const

// --- Tipos ---
interface InboxDashboardFiltersBarProps {
  members: AcceptedMemberDto[] | null
  labels: ConversationLabelDto[]
  isElevated: boolean
}

// --- Helpers ---
function getMemberInitials(member: AcceptedMemberDto): string {
  const name = member.user?.fullName ?? member.email
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// --- Componente Principal ---
export function InboxDashboardFiltersBar({
  members,
  labels,
  isElevated,
}: InboxDashboardFiltersBarProps) {
  const [filters, setFilters] = useQueryStates(inboxFiltersParsers)

  const hasActiveFilters =
    !!filters.channel ||
    !!filters.assignee ||
    !!filters.labelId ||
    !!filters.inboxStatus ||
    !!filters.aiVsHuman

  function clearAllFilters() {
    void setFilters({
      channel: null,
      assignee: null,
      labelId: null,
      inboxStatus: null,
      aiVsHuman: null,
    })
  }

  // Badges de filtros ativos
  const activeFilterBadges: Array<{ key: string; label: string }> = []

  if (filters.channel) {
    const channelOption = CHANNEL_OPTIONS.find(
      (option) => option.value === filters.channel,
    )
    if (channelOption) {
      activeFilterBadges.push({ key: 'channel', label: channelOption.label })
    }
  }

  if (filters.assignee && isElevated && members) {
    const member = members.find(
      (accepted) => accepted.userId === filters.assignee,
    )
    if (member) {
      activeFilterBadges.push({
        key: 'assignee',
        label: member.user?.fullName ?? member.email,
      })
    }
  }

  if (filters.labelId) {
    const selectedLabel = labels.find((label) => label.id === filters.labelId)
    if (selectedLabel) {
      activeFilterBadges.push({ key: 'labelId', label: selectedLabel.name })
    }
  }

  if (filters.inboxStatus) {
    const statusOption = STATUS_OPTIONS.find(
      (option) => option.value === filters.inboxStatus,
    )
    if (statusOption) {
      activeFilterBadges.push({ key: 'inboxStatus', label: statusOption.label })
    }
  }

  if (filters.aiVsHuman) {
    const aiHumanOption = AI_HUMAN_OPTIONS.find(
      (option) => option.value === filters.aiVsHuman,
    )
    if (aiHumanOption) {
      activeFilterBadges.push({ key: 'aiVsHuman', label: aiHumanOption.label })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Linha de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtro: Canal */}
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

        {/* Filtro: Atendente — só para elevated */}
        {isElevated && members && members.length > 0 && (
          <AssigneeFilter
            members={members}
            value={filters.assignee ?? null}
            onChange={(value) => void setFilters({ assignee: value })}
          />
        )}

        {/* Filtro: Etiqueta */}
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

        {/* Filtro: Status */}
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

        {/* Filtro: IA vs Humano */}
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

        {/* Limpar todos */}
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

      {/* Badges de filtros ativos */}
      {activeFilterBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterBadges.map((badge) => (
            <ActiveFilterBadge
              key={badge.key}
              label={badge.label}
              onRemove={() =>
                void setFilters({ [badge.key]: null })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Sub-componentes ---

interface AssigneeFilterProps {
  members: AcceptedMemberDto[]
  value: string | null
  onChange: (value: string | null) => void
}

function AssigneeFilter({ members, value, onChange }: AssigneeFilterProps) {
  const selectedMember = members.find(
    (member) => member.userId === value,
  )

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(selected) =>
        onChange(selected === 'all' ? null : selected)
      }
    >
      <SelectTrigger className="h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium">
        <Users className="size-3.5 text-muted-foreground" />
        {selectedMember ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-4">
              <AvatarImage
                src={selectedMember.user?.avatarUrl ?? undefined}
                alt={selectedMember.user?.fullName ?? selectedMember.email}
              />
              <AvatarFallback className="text-[8px]">
                {getMemberInitials(selectedMember)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">
              {selectedMember.user?.fullName ?? selectedMember.email}
            </span>
          </div>
        ) : (
          <SelectValue placeholder="Atendente" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os atendentes</SelectItem>
        <SelectSeparator />
        {members.map((member) => (
          <SelectItem key={member.id} value={member.userId ?? member.id}>
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage
                  src={member.user?.avatarUrl ?? undefined}
                  alt={member.user?.fullName ?? member.email}
                />
                <AvatarFallback className="text-[9px]">
                  {getMemberInitials(member)}
                </AvatarFallback>
              </Avatar>
              <span>{member.user?.fullName ?? member.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
