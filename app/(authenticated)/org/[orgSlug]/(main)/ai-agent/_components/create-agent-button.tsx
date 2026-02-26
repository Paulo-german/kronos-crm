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
import UpsertAgentSheetContent from './upsert-agent-sheet-content'

interface CreateAgentButtonProps {
  withinQuota?: boolean
}

const CreateAgentButton = ({
  withinQuota = true,
}: CreateAgentButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agente
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
          Novo Agente
        </Button>
      </SheetTrigger>
      <UpsertAgentSheetContent setIsOpen={setIsOpen} />
    </Sheet>
  )
}

export default CreateAgentButton
