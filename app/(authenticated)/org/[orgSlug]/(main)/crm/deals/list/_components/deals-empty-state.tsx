'use client'

import { useState } from 'react'
import { BriefcaseIcon } from 'lucide-react'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { DealDialogContent } from '../../_components/deal-dialog-content'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface DealsEmptyStateProps {
  stages: StageDto[]
  contacts: ContactDto[]
  withinQuota: boolean
}

export function DealsEmptyState({
  stages,
  contacts,
  withinQuota,
}: DealsEmptyStateProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <BriefcaseIcon className="size-10 text-primary-foreground" />
        </div>
      </div>

      <div className="max-w-sm text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Nenhuma negociação cadastrada
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Crie sua primeira negociação para acompanhar oportunidades comerciais,
          controlar valores e organizar o pipeline de vendas da sua equipe.
        </p>
      </div>

      {withinQuota ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Negociação
            </Button>
          </SheetTrigger>
          <DealDialogContent
            stages={stages}
            contacts={contacts}
            setIsOpen={setIsOpen}
          />
        </Sheet>
      ) : (
        <Button disabled className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Negociação
        </Button>
      )}
    </div>
  )
}
