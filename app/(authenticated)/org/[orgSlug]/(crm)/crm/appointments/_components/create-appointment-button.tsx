'use client'

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { UpsertAppointmentDialogContent } from './upsert-dialog-content'

import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'

interface CreateAppointmentButtonProps {
  members: AcceptedMemberDto[]
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
}

const CreateAppointmentButton = ({
  members,
  contactOptions,
  services,
}: CreateAppointmentButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setFormKey((prev) => prev + 1)
        setIsOpen(open)
      }}
    >
      <SheetTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </SheetTrigger>
      <UpsertAppointmentDialogContent
        key={formKey}
        setIsOpen={setIsOpen}
        members={members}
        contactOptions={contactOptions}
        services={services}
      />
    </Sheet>
  )
}

export default CreateAppointmentButton
