'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'

import InviteMemberDialogContent from './invite-dialog-content'

interface InviteMemberDialogProps {
  withinQuota?: boolean
}

const InviteMemberDialog = ({ withinQuota = true }: InviteMemberDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Convidar Membro
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Limite atingido. Faça upgrade do plano.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Convidar Membro
        </Button>
      </SheetTrigger>
      <InviteMemberDialogContent setIsOpen={setIsOpen} />
    </Sheet>
  )
}

export default InviteMemberDialog
