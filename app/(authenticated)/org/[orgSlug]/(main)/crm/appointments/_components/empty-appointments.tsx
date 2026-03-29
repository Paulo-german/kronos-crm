'use client'

import { useState } from 'react'
import { CalendarIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { UpsertAppointmentDialogContent } from './upsert-dialog-content'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

interface EmptyAppointmentsProps {
  dealOptions: DealOptionDto[]
  members: AcceptedMemberDto[]
}

export function EmptyAppointments({
  dealOptions,
  members,
}: EmptyAppointmentsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <CalendarIcon className="size-10 text-primary-foreground" />
        </div>
      </div>

      <div className="max-w-sm text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Nenhum agendamento encontrado
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Crie seu primeiro agendamento para acompanhar reuniões, demos e
          visitas vinculadas aos seus negócios.
        </p>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Novo Agendamento
          </Button>
        </SheetTrigger>
        <UpsertAppointmentDialogContent
          setIsOpen={setIsOpen}
          dealOptions={dealOptions}
          members={members}
        />
      </Sheet>
    </div>
  )
}
