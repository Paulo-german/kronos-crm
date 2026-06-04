'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/_components/ui/alert-dialog'
import { Button } from '@/_components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'

interface CancelBookingDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealTitle: string
  targetStatus: 'CANCELED' | 'NO_SHOW'
  isPending: boolean
  onConfirm: (dealResolution: 'MARK_LOST' | 'KEEP_OPEN') => void
}

export function CancelBookingDealDialog({
  open,
  onOpenChange,
  dealTitle,
  targetStatus,
  isPending,
  onConfirm,
}: CancelBookingDealDialogProps) {
  const [resolution, setResolution] = useState<'MARK_LOST' | 'KEEP_OPEN'>('MARK_LOST')

  const statusLabel = targetStatus === 'NO_SHOW' ? 'não comparecimento' : 'cancelamento'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Como deseja prosseguir com a negociação?</AlertDialogTitle>
          <AlertDialogDescription>
            O agendamento será marcado como{' '}
            {targetStatus === 'NO_SHOW' ? 'não comparecido' : 'cancelado'}.
            O que deve acontecer com a negociação <strong>{dealTitle}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={resolution}
          onValueChange={(value) => setResolution(value as 'MARK_LOST' | 'KEEP_OPEN')}
          className="gap-3 py-2"
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="MARK_LOST" id="mark-lost" className="mt-0.5" />
            <Label htmlFor="mark-lost" className="cursor-pointer font-normal leading-snug">
              <span className="font-medium">Marcar como Perdida</span>
              <p className="text-muted-foreground text-sm">
                A negociação será encerrada como perdida em função do {statusLabel}.
              </p>
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="KEEP_OPEN" id="keep-open" className="mt-0.5" />
            <Label htmlFor="keep-open" className="cursor-pointer font-normal leading-snug">
              <span className="font-medium">Manter em aberto</span>
              <p className="text-muted-foreground text-sm">
                A negociação continuará aberta e poderá ser reagendada.
              </p>
            </Label>
          </div>
        </RadioGroup>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => onConfirm(resolution)}
          >
            {isPending ? 'Salvando...' : 'Confirmar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
