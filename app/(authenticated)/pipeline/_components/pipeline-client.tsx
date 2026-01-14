'use client'

import { useState } from 'react'
import { Dialog } from '@/_components/ui/dialog'
import { KanbanBoard } from './kanban-board'
import { DealDialogContent } from './deal-dialog-content'
import { EmptyPipeline } from './empty-pipeline'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type {
  DealDto,
  DealsByStageDto,
} from '@/_data-access/deal/get-deals-by-pipeline'
import type { ContactDto } from '@/_data-access/contact/get-contacts'

interface PipelineClientProps {
  pipeline: PipelineWithStagesDto | null
  dealsByStage: DealsByStageDto
  contacts: ContactDto[]
}

interface DealDialogState {
  isOpen: boolean
  stageId: string
  deal: DealDto | null
}

export const PipelineClient = ({
  pipeline,
  dealsByStage,
  contacts,
}: PipelineClientProps) => {
  const [dialogState, setDialogState] = useState<DealDialogState>({
    isOpen: false,
    stageId: '',
    deal: null,
  })

  if (!pipeline) {
    return <EmptyPipeline />
  }

  const handleAddDeal = (stageId: string) => {
    setDialogState({
      isOpen: true,
      stageId,
      deal: null,
    })
  }

  const handleDealClick = (deal: DealDto) => {
    setDialogState({
      isOpen: true,
      stageId: deal.stageId,
      deal,
    })
  }

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      stageId: '',
      deal: null,
    })
  }

  return (
    <>
      <KanbanBoard
        pipeline={pipeline}
        dealsByStage={dealsByStage}
        onAddDeal={handleAddDeal}
        onDealClick={handleDealClick}
      />

      <Dialog
        open={dialogState.isOpen}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DealDialogContent
          key={
            dialogState.deal
              ? `edit-${dialogState.deal.id}`
              : `new-${dialogState.stageId}`
          }
          defaultValues={
            dialogState.deal
              ? {
                  id: dialogState.deal.id,
                  title: dialogState.deal.title,
                  stageId: dialogState.deal.stageId,
                  contactId: dialogState.deal.contactId || undefined,
                  companyId: dialogState.deal.companyId || undefined,
                  expectedCloseDate:
                    dialogState.deal.expectedCloseDate || undefined,
                }
              : { stageId: dialogState.stageId }
          }
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
