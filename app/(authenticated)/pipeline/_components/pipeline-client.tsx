'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
}

export const PipelineClient = ({
  pipeline,
  dealsByStage,
  contacts,
}: PipelineClientProps) => {
  const router = useRouter()
  const [dialogState, setDialogState] = useState<DealDialogState>({
    isOpen: false,
    stageId: '',
  })

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
    // Navega para a página de detalhes do deal
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
