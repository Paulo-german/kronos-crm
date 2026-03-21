'use client'

import { useState } from 'react'
import { Button } from '@/_components/ui/button'
import { Plus } from 'lucide-react'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import UpsertInboxSheetContent from './upsert-inbox-sheet-content'

interface AgentOption {
  id: string
  name: string
}

interface CreateInboxButtonProps {
  agentOptions: AgentOption[]
  withinQuota?: boolean
}

const CreateInboxButton = ({
  agentOptions,
  withinQuota = true,
}: CreateInboxButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Nova Caixa de Entrada
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
          Nova Caixa de Entrada
        </Button>
      </SheetTrigger>
      <UpsertInboxSheetContent
        setIsOpen={setIsOpen}
        agentOptions={agentOptions}
      />
    </Sheet>
  )
}

export default CreateInboxButton
