'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
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
import { markDealLost } from '@/_actions/deal/mark-deal-lost'

interface MarkLostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string
  lostReasons: { id: string; name: string }[]
}

const MarkLostDialog = ({
  open,
  onOpenChange,
  dealId,
  lostReasons,
}: MarkLostDialogProps) => {
  const [selectedLostReason, setSelectedLostReason] = useState<
    string | undefined
  >(undefined)

  const { execute, isPending } = useAction(markDealLost, {
    onSuccess: () => {
      toast.success('Deal marcado como perdido.', { position: 'bottom-right' })
      setSelectedLostReason(undefined)
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao marcar como perdido.', {
        position: 'bottom-right',
      })
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedLostReason(undefined)
    onOpenChange(next)
  }

  const handleMarkLost = () => {
    if (selectedLostReason) {
      execute({ dealId, lossReasonId: selectedLostReason })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como Perdido</DialogTitle>
          <DialogDescription>
            Por que esta negociação foi perdida?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="loss-reason">Motivo da Perda</Label>
          <Select
            value={selectedLostReason}
            onValueChange={setSelectedLostReason}
          >
            <SelectTrigger id="loss-reason" className="mt-2 w-full">
              <SelectValue placeholder="Selecione um motivo..." />
            </SelectTrigger>
            <SelectContent>
              {lostReasons.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Nenhum motivo cadastrado.
                  <br />
                  Vá em Configurações para adicionar.
                </div>
              ) : (
                lostReasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
            variant="destructive"
            onClick={handleMarkLost}
            disabled={!selectedLostReason || isPending}
          >
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MarkLostDialog
