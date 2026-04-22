'use client'

import { useEffect, useState, useCallback } from 'react'
import { SearchIcon, UserIcon, ArrowUpDown } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { DealsFiltersSheet } from './deals-filters-sheet'
import { DealFilterBadges } from './deal-filter-badges'
import { ViewToggle } from '../../_components/view-toggle'
import { PipelineSelector } from '../../_components/pipeline-selector'
import { PipelineSettingsButton } from '../../_components/pipeline-settings-button'
import { TutorialTriggerButton } from '@/_components/tutorials/tutorial-trigger-button'
import CreateDealButton from '../../_components/create-deal-button'
import { ExportDealsButton } from './export-deals-button'
import { DEAL_SORT_OPTIONS } from '../_lib/deal-list-params'
import type { DealListSortOption } from '../_lib/use-deal-list-filters'
import type { DealFilters } from '../../_lib/deal-filters'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { StageDto, PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { MemberRole } from '@prisma/client'

const SEARCH_DEBOUNCE_MS = 300

interface DealsToolbarProps {
  members: AcceptedMemberDto[]
  contacts: ContactDto[]
  stages: StageDto[]
  pipeline: PipelineWithStagesDto
  pipelines: OrgPipelineDto[]
  activePipelineId: string
  onPipelineChange: (pipelineId: string | null) => void
  pipelineId: string | null
  currentUserId: string
  userRole: MemberRole
  withinQuota: boolean
  // Filtros controlados pelo pai (useDealListFilters)
  filters: DealFilters
  onApplyFilters: (filters: Partial<DealFilters>) => void
  onClearFilters: () => void
  activeFilterCount: number
  sort: DealListSortOption
  onSortChange: (value: DealListSortOption) => void
  assignedTo: string | null
  onAssignedToChange: (value: string | null) => void
  search: string
  onSearchChange: (value: string | null) => void
  isTutorialCompleted: boolean
}

export function DealsToolbar({
  members,
  contacts,
  stages,
  pipeline,
  pipelines,
  activePipelineId,
  onPipelineChange,
  pipelineId,
  currentUserId,
  userRole,
  withinQuota,
  filters,
  onApplyFilters,
  onClearFilters,
  activeFilterCount,
  sort,
  onSortChange,
  assignedTo,
  onAssignedToChange,
  search,
  onSearchChange,
  isTutorialCompleted,
}: DealsToolbarProps) {
  const isMember = userRole === 'MEMBER'
  const isElevated = userRole === 'ADMIN' || userRole === 'OWNER'

  // Valor local do input de busca com debounce para URL
  const [searchInputValue, setSearchInputValue] = useState(search)

  // Sincroniza input quando o valor da URL muda externamente (ex: limpar filtros)
  useEffect(() => {
    setSearchInputValue(search)
  }, [search])

  // Debounce: atualiza URL 300ms após parar de digitar
  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = searchInputValue.trim()
      onSearchChange(trimmed || null)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInputValue])

  const handleAssigneeChange = useCallback(
    (value: string) => {
      onAssignedToChange(value === 'all' ? null : value)
    },
    [onAssignedToChange],
  )

  const handleSortChange = useCallback(
    (value: string) => {
      onSortChange(value as DealListSortOption)
    },
    [onSortChange],
  )

  const hasAnyActiveFilter =
    activeFilterCount > 0 || !!search || (!!assignedTo && !isMember)

  return (
    <div className="flex flex-col gap-3">
      {/* Linha 1: Search com largura total */}
      <div className="relative w-full">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título da negociação..."
          value={searchInputValue}
          onChange={(event) => setSearchInputValue(event.target.value)}
          className="pl-9"
        />
      </div>

      {/* Linha 2: PipelineSelector + Sort + Responsável + Filtros + ViewToggle + Tutorial + PipelineSettings + Criar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Seletor de funil — hierarquia primária: escolhe funil antes de ordenar/filtrar */}
        <PipelineSelector
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          onChange={onPipelineChange}
        />

        {/* Select de Ordenação */}
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[200px]">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DEAL_SORT_OPTIONS).map(([key, option]) => (
              <SelectItem key={key} value={key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Select de Responsável */}
        <Select
          value={isMember ? currentUserId : (assignedTo ?? 'all')}
          onValueChange={handleAssigneeChange}
          disabled={isMember}
        >
          <SelectTrigger className="w-[200px]">
            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            {!isMember && (
              <SelectItem value="all">Todos os responsáveis</SelectItem>
            )}
            {members.map((member) => (
              <SelectItem
                key={member.userId ?? member.id}
                value={member.userId ?? currentUserId}
              >
                {member.user?.fullName ?? member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botão Filtros Avançados */}
        <DealsFiltersSheet
          filters={filters}
          onFiltersChange={onApplyFilters}
          activeFilterCount={activeFilterCount}
        />

        <ExportDealsButton
          filters={{
            search: search,
            status: filters.status,
            priority: filters.priority,
            assignedTo: assignedTo ?? undefined,
            dateFrom: filters.createdAtFrom ? filters.createdAtFrom.toISOString().split('T')[0] : null,
            dateTo: filters.createdAtTo ? filters.createdAtTo.toISOString().split('T')[0] : null,
            valueMin: filters.valueMin,
            valueMax: filters.valueMax,
            sort: sort,
            pipelineId: pipelineId ?? undefined,
          }}
        />

        <div className="ml-auto flex items-center gap-2">
          <ViewToggle activeView="list" />

          <TutorialTriggerButton
            tutorialId="pipeline"
            isCompleted={isTutorialCompleted}
          />

          {isElevated && (
            <PipelineSettingsButton pipeline={pipeline} />
          )}

          <CreateDealButton
            stages={stages}
            contacts={contacts}
            withinQuota={withinQuota}
          />
        </div>
      </div>

      {/* Linha 3: Badges de filtros ativos */}
      {hasAnyActiveFilter && (
        <DealFilterBadges
          filters={filters}
          onFiltersChange={onApplyFilters}
          onClearFilters={onClearFilters}
          hasActiveFilters={activeFilterCount > 0}
        />
      )}
    </div>
  )
}
