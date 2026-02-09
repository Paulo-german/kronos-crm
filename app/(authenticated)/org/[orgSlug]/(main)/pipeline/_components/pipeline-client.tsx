'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dialog } from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { Settings } from 'lucide-react'
import { KanbanBoard } from './kanban-board'
import { DealDialogContent } from './deal-dialog-content'
import { EmptyPipeline } from './empty-pipeline'
import { PipelineFiltersSheet } from './pipeline-filters-sheet'
import { PipelineFilterBadges } from './pipeline-filter-badges'
import { usePipelineFilters } from '../_lib/use-pipeline-filters'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type {
  DealDto,
  DealsByStageDto,
} from '@/_data-access/deal/get-deals-by-pipeline'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { MemberRole } from '@prisma/client'

interface PipelineClientProps {
  pipeline: PipelineWithStagesDto | null
  dealsByStage: DealsByStageDto
  contacts: ContactDto[]
  userRole: MemberRole
}

interface DealDialogState {
  isOpen: boolean
  stageId: string
}

export const PipelineClient = ({
  pipeline,
  dealsByStage,
  contacts,
  userRole,
}: PipelineClientProps) => {
  const router = useRouter()
  const [dialogState, setDialogState] = useState<DealDialogState>({
    isOpen: false,
    stageId: '',
  })
  const {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
  } = usePipelineFilters()

  const canManagePipeline = userRole === 'ADMIN' || userRole === 'OWNER'

  if (!pipeline) {
    return <EmptyPipeline />
  }

  const handleAddDeal = (stageId: string) => {
    setDialogState({
      isOpen: true,
      stageId,
    })
  }

  const handleDealClick = (deal: DealDto) => {
    router.push(`/pipeline/deal/${deal.id}`)
  }

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      stageId: '',
    })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas oportunidades.
          </p>
        </div>
        {canManagePipeline && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/pipeline/settings">
              <Settings className="mr-2 h-4 w-4" />
              Configurar Pipeline
            </Link>
          </Button>
        )}
      </div>

      <KanbanBoard
        pipeline={pipeline}
        dealsByStage={dealsByStage}
        onAddDeal={handleAddDeal}
        onDealClick={handleDealClick}
        filters={filters}
        filtersSheet={
          <PipelineFiltersSheet
            filters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
          />
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

      <Dialog
        open={dialogState.isOpen}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DealDialogContent
          key={`new-${dialogState.stageId}`}
          defaultValues={{ stageId: dialogState.stageId }}
          stages={pipeline.stages}
          contacts={contacts}
          setIsOpen={(open) => {
            if (typeof open === 'boolean' && !open) {
              closeDialog()
            }
          }}
        />
      </Dialog>
    </>
  )
}
