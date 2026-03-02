'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { UpsertAppointmentDialogContent } from './upsert-dialog-content'

import { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

interface CreateAppointmentButtonProps {
  dealOptions: DealOptionDto[]
  members: AcceptedMemberDto[]
}

const CreateAppointmentButton = ({
  dealOptions,
  members,
}: CreateAppointmentButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
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
  )
}

export default CreateAppointmentButton
