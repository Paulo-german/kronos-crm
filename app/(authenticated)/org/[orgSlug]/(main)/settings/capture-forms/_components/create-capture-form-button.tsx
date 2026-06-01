'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import { UpsertCaptureFormDialog } from './upsert-capture-form-dialog'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { SquadDto } from '@/_data-access/squad/get-squads'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'

interface CreateCaptureFormButtonProps {
  withinQuota: boolean
  members: AcceptedMemberDto[]
  squads: SquadDto[]
  fieldDefinitions: FieldDefinitionDto[]
  privacyPolicyUrl: string | null
}

const CreateCaptureFormButton = ({ withinQuota, members, squads, fieldDefinitions, privacyPolicyUrl }: CreateCaptureFormButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Novo formulário
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Disponível a partir do plano Essential.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Novo formulário
      </Button>
      <UpsertCaptureFormDialog open={isOpen} onOpenChange={setIsOpen} members={members} squads={squads} fieldDefinitions={fieldDefinitions} privacyPolicyUrl={privacyPolicyUrl} />
    </>
  )
}

export default CreateCaptureFormButton
