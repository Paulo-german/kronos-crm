'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { KronosLogo } from '../icons/kronos-logo'

interface TrialReminderDialogProps {
  daysRemaining: number
  orgSlug: string
}

export const TrialReminderDialog = ({
  daysRemaining,
  orgSlug,
}: TrialReminderDialogProps) => {
  const [open, setOpen] = useState(false)
  const storageKey = `kronos-trial-reminder-${orgSlug}`

  useEffect(() => {
    const shown = sessionStorage.getItem(storageKey)
    if (!shown) {
      setOpen(true)
      sessionStorage.setItem(storageKey, '1')
    }
  }, [storageKey])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <div className="flex">
          {/* Lado esquerdo: gradiente decorativo */}
          <div className="bg-banner-premium hidden w-[200px] shrink-0 flex-col items-center justify-center gap-4 sm:flex">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <KronosLogo className="h-8 w-8 text-white" />
            </div>
            <div className="px-4 text-center">
              <p className="text-lg font-bold text-white">
                {daysRemaining <= 1 ? 'Ultimo dia!' : `${daysRemaining} dias`}
              </p>
            </div>
          </div>

          {/* Lado direito: conteudo */}
          <div className="flex flex-1 flex-col p-6">
            <DialogHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 sm:hidden">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">
                {daysRemaining <= 1
                  ? 'Ultimo dia de teste!'
                  : `Restam ${daysRemaining} dias de teste`}
              </DialogTitle>
              <DialogDescription className="pt-1">
                Seu periodo de teste esta acabando. Assine agora para continuar
                acessando todos os seus dados e funcionalidades sem interrupcao.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-4">
              <Button asChild>
                <Link href={`/org/${orgSlug}/settings/billing`}>
                  Ver planos
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Continuar testando
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
