'use client'

import { useState } from 'react'
import { ClipboardCheck, PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { UpsertTaskDialogContent } from './upsert-dialog-content'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'

interface EmptyTasksProps {
  dealOptions: DealOptionDto[]
}

export function EmptyTasks({ dealOptions }: EmptyTasksProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <ClipboardCheck className="size-10 text-primary-foreground" />
        </div>
      </div>

      <div className="max-w-sm text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Nenhuma tarefa cadastrada
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Crie sua primeira tarefa para começar a organizar suas atividades
          vinculadas aos seus negócios.
        </p>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </SheetTrigger>
        <UpsertTaskDialogContent
          setIsOpen={setIsOpen}
          dealOptions={dealOptions}
        />
      </Sheet>
    </div>
  )
}
