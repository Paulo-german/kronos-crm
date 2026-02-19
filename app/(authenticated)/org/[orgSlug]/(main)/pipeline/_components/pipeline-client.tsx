'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { Settings2Icon } from 'lucide-react'
import { KanbanBoard } from './kanban-board'
import { DealDialogContent } from './deal-dialog-content'
import { EmptyPipeline } from './empty-pipeline'
import { SettingsClient } from './settings-client'
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
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
  } = usePipelineFilters()

  const canManagePipeline = userRole === 'ADMIN' || userRole === 'OWNER'

  if (!pipeline) {
    return (
      <EmptyPipeline
        onOpenSettings={
          canManagePipeline ? () => setSettingsOpen(true) : undefined
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
      <Header>
        <HeaderLeft>
          <HeaderTitle>Pipeline de Vendas</HeaderTitle>
          <HeaderSubTitle>
            Visualize e gerencie suas oportunidades
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          {canManagePipeline && (
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2Icon className="mr-2 h-4 w-4" />
              Configurar Pipeline
            </Button>
          )}
        </HeaderRight>
      </Header>

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

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Configurações do Pipeline</SheetTitle>
            <SheetDescription>
              Gerencie as etapas do seu funil de vendas.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SettingsClient pipeline={pipeline} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
