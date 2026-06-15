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
import { DealDialogContent, type DealMemberOption } from './deal-dialog-content'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface CreateDealButtonProps {
  stages: StageDto[]
  members?: DealMemberOption[]
  withinQuota?: boolean
}

const CreateDealButton = ({
  stages,
  members = [],
  withinQuota = true,
}: CreateDealButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Negociação
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Negociação
        </Button>
      </SheetTrigger>
      <DealDialogContent
        open={isOpen}
        stages={stages}
        members={members}
        setIsOpen={setIsOpen}
      />
    </Sheet>
  )
}

export default CreateDealButton
