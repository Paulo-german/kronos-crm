'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { DealDialogContent } from './deal-dialog-content'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface CreateDealButtonProps {
  stages: StageDto[]
  contacts: ContactDto[]
  withinQuota?: boolean
}

const CreateDealButton = ({
  stages,
  contacts,
  withinQuota = true,
}: CreateDealButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Negociação
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Limite atingido. Faca upgrade do plano.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Negociação
        </Button>
      </SheetTrigger>
      <DealDialogContent
        stages={stages}
        contacts={contacts}
        setIsOpen={setIsOpen}
      />
    </Sheet>
  )
}

export default CreateDealButton
