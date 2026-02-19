'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
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
        <TooltipContent>Limite atingido. Faca upgrade do plano.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Convidar Membro
        </Button>
      </DialogTrigger>
      <InviteMemberDialogContent setIsOpen={setIsOpen} />
    </Dialog>
  )
}

export default InviteMemberDialog
