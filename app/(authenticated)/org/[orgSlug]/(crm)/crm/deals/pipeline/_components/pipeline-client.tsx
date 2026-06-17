'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import { KanbanBoard } from './kanban-board'
import CreateDealButton from '../../_components/create-deal-button'
import { DealDialogContent } from '../../_components/deal-dialog-content'
import { ViewToggle } from '../../_components/view-toggle'
import { EmptyPipeline } from './empty-pipeline'
import { DealFiltersSheet } from '../../_components/deal-filters-sheet'
import { PipelineFilterBadges } from './pipeline-filter-badges'
import { usePipelineFilters } from '../_lib/use-pipeline-filters'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { MemberRole } from '@prisma/client'
import { Settings2Icon } from 'lucide-react'
import { PageTourTrigger } from '@/_components/onboarding/page-tour-trigger'
import { DEALS_TOUR_STEPS } from '@/_lib/onboarding/tours/deals-tour'
import { PipelineSelector } from '../../_components/pipeline-selector'
import { RefreshPipelineButton } from './refresh-pipeline-button'

export interface MemberOption {
  userId: string
  name: string
}

interface PipelineClientProps {
  pipeline: PipelineWithStagesDto | null
  pipelines: OrgPipelineDto[]
  activePipelineId: string
  members: MemberOption[]
  currentUserId: string
  userRole: MemberRole
}

interface DealDialogState {
  isOpen: boolean
  stageId: string
}

export const PipelineClient = ({
  pipeline,
  pipelines,
  activePipelineId,
  members,
  currentUserId,
  userRole,
}: PipelineClientProps) => {
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const [dialogState, setDialogState] = useState<DealDialogState>({
    isOpen: false,
    stageId: '',
  })
  const queryClient = useQueryClient()

  // Criar/editar deal revalida a tag no servidor, mas as colunas leem via React
  // Query — então invalidamos as queries do Kanban para refletir a mudança na hora.
  const invalidatePipelineData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] })
    void queryClient.invalidateQueries({ queryKey: ['pipeline-aggregates'] })
  }, [queryClient])
  const {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    sortBy,
    setSortBy,
    assignees,
    setAssignees,
  } = usePipelineFilters()

  const canManagePipeline =
    userRole === 'ADMIN' || userRole === 'OWNER' || userRole === 'SUPPORT'

  if (!pipeline) {
    return (
      <EmptyPipeline
        settingsHref={
          canManagePipeline
            ? `/org/${params.orgSlug}/settings/pipelines`
            : undefined
        }
      />
    )
  }

  const handleAddDeal = (stageId: string) => {
    setDialogState({
      isOpen: true,
      stageId,
    })
  }

  const handleDealClick = (deal: DealDto) => {
    router.push(`/crm/deals/${deal.id}`)
  }

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      stageId: '',
    })
  }

  return (
    <>
      <div data-tour="deals-kanban" className="flex min-h-0 flex-1 flex-col">
        <KanbanBoard
          pipeline={pipeline}
          members={members}
          currentUserId={currentUserId}
          userRole={userRole}
          onAddDeal={handleAddDeal}
          onDealClick={handleDealClick}
          filters={filters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          assignees={assignees}
          onAssigneesChange={setAssignees}
          viewToggle={<ViewToggle activeView="pipeline" />}
          pipelineSelector={
            <PipelineSelector
              pipelines={pipelines}
              activePipelineId={activePipelineId}
            />
          }
          refreshButton={<RefreshPipelineButton />}
          settingsButton={
            canManagePipeline ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link
                  href={`/org/${params.orgSlug}/settings/pipelines/${pipeline.id}`}
                >
                  <Settings2Icon className="h-4 w-4" />
                </Link>
              </Button>
            ) : null
          }
          createButton={
            <CreateDealButton
              stages={pipeline.stages}
              members={members}
              onMutationSuccess={invalidatePipelineData}
            />
          }
          filtersSheet={
            <div data-tour="deals-filters">
              <DealFiltersSheet
                filters={filters}
                onFiltersChange={setFilters}
                activeFilterCount={activeFilterCount}
              />
            </div>
          }
          filterBadges={
            <PipelineFilterBadges
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          }
        />
      </div>

      <Sheet
        open={dialogState.isOpen}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DealDialogContent
          key={`new-${dialogState.stageId}`}
          open={dialogState.isOpen}
          defaultValues={{ stageId: dialogState.stageId }}
          stages={pipeline.stages}
          members={members}
          setIsOpen={(open) => {
            if (typeof open === 'boolean' && !open) {
              closeDialog()
            }
          }}
          onMutationSuccess={invalidatePipelineData}
        />
      </Sheet>

      <PageTourTrigger tourId="deals" steps={DEALS_TOUR_STEPS} />
    </>
  )
}
