'use client'

import { Filter, UserX } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Separator } from '@/_components/ui/separator'
import { ScrollArea } from '@/_components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { getLabelColor } from '@/_lib/constants/label-colors'
import type { ConversationLabelDto } from '@/_data-access/conversation/get-conversations'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

const UNASSIGNED_SENTINEL = 'unassigned'

function getMemberInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

interface ConversationFilterPanelProps {
  statusFilter: 'OPEN' | 'RESOLVED'
  onStatusFilterChange: (status: 'OPEN' | 'RESOLVED') => void
  selectedLabelIds: string[]
  onLabelIdsChange: (ids: string[]) => void
  availableLabels: ConversationLabelDto[]
  selectedAssigneeIds: string[]
  onAssigneeIdsChange: (ids: string[]) => void
  availableAssignees: AcceptedMemberDto[]
  currentUserId: string
  showAssigneeFilter: boolean
}

export function ConversationFilterPanel({
  statusFilter,
  onStatusFilterChange,
  selectedLabelIds,
  onLabelIdsChange,
  availableLabels,
  selectedAssigneeIds,
  onAssigneeIdsChange,
  availableAssignees,
  currentUserId,
  showAssigneeFilter,
}: ConversationFilterPanelProps) {
  const hasActiveFilters =
    statusFilter !== 'OPEN'
    || selectedLabelIds.length > 0
    || selectedAssigneeIds.length > 0

  const handleLabelToggle = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onLabelIdsChange(selectedLabelIds.filter((id) => id !== labelId))
    } else {
      onLabelIdsChange([...selectedLabelIds, labelId])
    }
  }

  const handleAssigneeToggle = (assigneeId: string) => {
    if (selectedAssigneeIds.includes(assigneeId)) {
      onAssigneeIdsChange(selectedAssigneeIds.filter((id) => id !== assigneeId))
    } else {
      onAssigneeIdsChange([...selectedAssigneeIds, assigneeId])
    }
  }

  const handleClearFilters = () => {
    onStatusFilterChange('OPEN')
    onLabelIdsChange([])
    onAssigneeIdsChange([])
  }

  // Membros atribuíveis (exclui pending/sem userId) e remove o próprio usuário (atalho dedicado)
  const assignableMembers = availableAssignees.filter(
    (member) => member.userId && member.userId !== currentUserId,
  )
  const isMineSelected = selectedAssigneeIds.includes(currentUserId)
  const isUnassignedSelected = selectedAssigneeIds.includes(UNASSIGNED_SENTINEL)

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative h-7 w-7',
                  hasActiveFilters
                    ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                {/* Indicador de filtros ativos */}
                {hasActiveFilters && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
                <span className="sr-only">Filtros</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{hasActiveFilters ? 'Filtros ativos' : 'Filtrar conversas'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" className="w-64 p-0" sideOffset={4}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs font-semibold text-foreground">Filtros</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {(statusFilter !== 'OPEN' ? 1 : 0) + selectedLabelIds.length + selectedAssigneeIds.length} ativos
            </Badge>
          )}
        </div>

        <Separator />

        {/* Seção: Status */}
        <div className="px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <RadioGroup
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as 'OPEN' | 'RESOLVED')}
            className="space-y-1"
          >
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50">
              <RadioGroupItem value="OPEN" id="filter-status-open" className="h-3.5 w-3.5" />
              <span className="text-sm">Abertas</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50">
              <RadioGroupItem value="RESOLVED" id="filter-status-resolved" className="h-3.5 w-3.5" />
              <span className="text-sm">Resolvidas</span>
            </label>
          </RadioGroup>
        </div>

        {availableLabels.length > 0 && (
          <>
            <Separator />

            {/* Seção: Etiquetas */}
            <div className="px-3 py-2.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Etiquetas
              </p>
              <ScrollArea className="max-h-48">
                <div className="space-y-0.5 pr-2">
                  {availableLabels.map((label) => {
                    const isSelected = selectedLabelIds.includes(label.id)
                    const colorConfig = getLabelColor(label.color)

                    return (
                      <label
                        key={label.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-accent/50',
                          isSelected && 'bg-accent/30',
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleLabelToggle(label.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span
                          className={cn('h-2 w-2 shrink-0 rounded-full', colorConfig.dot)}
                        />
                        <span className="truncate text-sm">{label.name}</span>
                      </label>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {showAssigneeFilter && (
          <>
            <Separator />

            {/* Seção: Responsável */}
            <div className="px-3 py-2.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Responsável
              </p>

              {/* Atalhos fixos */}
              <div className="space-y-0.5">
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-accent/50',
                    isMineSelected && 'bg-accent/30',
                  )}
                >
                  <Checkbox
                    checked={isMineSelected}
                    onCheckedChange={() => handleAssigneeToggle(currentUserId)}
                    className="h-3.5 w-3.5"
                  />
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
                      EU
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">Atribuídas a mim</span>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-accent/50',
                    isUnassignedSelected && 'bg-accent/30',
                  )}
                >
                  <Checkbox
                    checked={isUnassignedSelected}
                    onCheckedChange={() => handleAssigneeToggle(UNASSIGNED_SENTINEL)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserX className="h-3 w-3" />
                  </span>
                  <span className="truncate text-sm">Não atribuídas</span>
                </label>
              </div>

              {assignableMembers.length > 0 && (
                <>
                  <Separator className="my-1.5" />
                  <ScrollArea className="max-h-48">
                    <div className="space-y-0.5 pr-2">
                      {assignableMembers.map((member) => {
                        const memberUserId = member.userId
                        if (!memberUserId) return null
                        const isSelected = selectedAssigneeIds.includes(memberUserId)
                        const displayName = member.user?.fullName ?? member.email
                        const initials = getMemberInitials(member.user?.fullName ?? null)

                        return (
                          <label
                            key={member.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-accent/50',
                              isSelected && 'bg-accent/30',
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleAssigneeToggle(memberUserId)}
                              className="h-3.5 w-3.5"
                            />
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarImage src={member.user?.avatarUrl ?? undefined} />
                              <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm">{displayName}</span>
                          </label>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </>
        )}

        {/* Footer: limpar filtros */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
