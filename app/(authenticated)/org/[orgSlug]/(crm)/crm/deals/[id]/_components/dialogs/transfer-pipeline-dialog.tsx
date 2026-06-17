'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Label } from '@/_components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { transferDealToPipeline } from '@/_actions/deal/transfer-deal-to-pipeline'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'

interface AvailablePipeline {
  pipelineId: string
  pipelineName: string
}

interface TransferPipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string
  availablePipelines: AvailablePipeline[]
  pipelineStageOptions: PipelineStageOption[]
}

const TransferPipelineDialog = ({
  open,
  onOpenChange,
  dealId,
  availablePipelines,
  pipelineStageOptions,
}: TransferPipelineDialogProps) => {
  const [selectedTargetPipelineId, setSelectedTargetPipelineId] = useState<
    string | undefined
  >(undefined)
  const [selectedTargetStageId, setSelectedTargetStageId] = useState<
    string | undefined
  >(undefined)

  const { execute, isPending } = useAction(transferDealToPipeline, {
    onSuccess: () => {
      toast.success('Negociação transferida para outro pipeline!', {
        position: 'bottom-right',
      })
      setSelectedTargetPipelineId(undefined)
      setSelectedTargetStageId(undefined)
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Erro ao transferir para outro pipeline.',
        { position: 'bottom-right' },
      )
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedTargetPipelineId(undefined)
      setSelectedTargetStageId(undefined)
    }
    onOpenChange(next)
  }

  const handleTransfer = () => {
    if (selectedTargetPipelineId && selectedTargetStageId) {
      execute({
        dealId,
        targetPipelineId: selectedTargetPipelineId,
        targetStageId: selectedTargetStageId,
      })
    }
  }

  const availableTargetStages = pipelineStageOptions.filter(
    (option) => option.pipelineId === selectedTargetPipelineId,
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir para outro Pipeline</DialogTitle>
          <DialogDescription>
            Selecione o pipeline de destino e a etapa inicial para esta
            negociação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-pipeline">Pipeline de Destino</Label>
            <Select
              value={selectedTargetPipelineId}
              onValueChange={(value) => {
                setSelectedTargetPipelineId(value)
                setSelectedTargetStageId(undefined)
              }}
            >
              <SelectTrigger id="target-pipeline" className="w-full">
                <SelectValue placeholder="Selecione um pipeline..." />
              </SelectTrigger>
              <SelectContent>
                {availablePipelines.map((pipeline) => (
                  <SelectItem
                    key={pipeline.pipelineId}
                    value={pipeline.pipelineId}
                  >
                    {pipeline.pipelineName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-stage">Etapa de Entrada</Label>
            <Select
              value={selectedTargetStageId}
              onValueChange={setSelectedTargetStageId}
              disabled={!selectedTargetPipelineId}
            >
              <SelectTrigger id="target-stage" className="w-full">
                <SelectValue
                  placeholder={
                    selectedTargetPipelineId
                      ? 'Selecione uma etapa...'
                      : 'Selecione um pipeline primeiro...'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableTargetStages.map((option) => (
                  <SelectItem key={option.stageId} value={option.stageId}>
                    {option.stageName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedTargetStageId || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              'Transferir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TransferPipelineDialog
