'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import { UpsertGroupSheetContent } from './upsert-group-dialog'
import type { AgentDto } from '@/_data-access/agent/get-agents'

interface CreateGroupButtonProps {
  withinQuota: boolean
  agents: AgentDto[]
}

export function CreateGroupButton({ withinQuota, agents }: CreateGroupButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Criar Equipe
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Limite atingido. Faça upgrade do plano para criar mais equipes.</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Criar Equipe
        </Button>
      </SheetTrigger>
      <UpsertGroupSheetContent setIsOpen={setIsOpen} agents={agents} />
    </Sheet>
  )
}
