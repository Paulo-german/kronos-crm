'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import { UpsertCaptureFormDialog } from './upsert-capture-form-dialog'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

interface CreateCaptureFormButtonProps {
  withinQuota: boolean
  members: AcceptedMemberDto[]
}

const CreateCaptureFormButton = ({ withinQuota, members }: CreateCaptureFormButtonProps) => {
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
      <UpsertCaptureFormDialog open={isOpen} onOpenChange={setIsOpen} members={members} />
    </>
  )
}

export default CreateCaptureFormButton
