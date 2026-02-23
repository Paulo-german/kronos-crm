'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Button } from '@/_components/ui/button'
import { deleteStageWithMigration } from '@/_actions/pipeline/delete-stage-with-migration'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface DeleteStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stage: StageDto
  availableStages: StageDto[] // Outras etapas para onde migrar
}

export function DeleteStageDialog({
  open,
  onOpenChange,
  stage,
  availableStages,
}: DeleteStageDialogProps) {
  const [targetStageId, setTargetStageId] = useState<string>('')

  const { execute, isPending } = useAction(deleteStageWithMigration, {
    onSuccess: ({ data }) => {
      toast.success(
        `Etapa excluída! ${data?.movedDealsCount || 0} deal(s) movido(s).`,
      )
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir etapa.')
    },
  })

  const handleConfirm = () => {
    if (!targetStageId) {
      toast.error('Selecione uma etapa de destino.')
      return
    }
    execute({ stageId: stage.id, targetStageId })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reatribuir Deals</DialogTitle>
          <DialogDescription>
            A etapa <strong>{stage.name}</strong> possui {stage.dealCount}{' '}
            deal(s). Para onde você deseja movê-los antes de excluir?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Etapa de Destino</label>
            <Select value={targetStageId} onValueChange={setTargetStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etapa..." />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !targetStageId}
          >
            {isPending ? 'Excluindo...' : 'Excluir e Mover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
