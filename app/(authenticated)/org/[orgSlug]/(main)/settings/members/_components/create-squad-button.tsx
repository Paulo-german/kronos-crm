'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { UpsertSquadSheetContent } from './upsert-squad-sheet-content'

interface CreateSquadButtonProps {
  withinQuota: boolean
  orgSlug: string
}

export function CreateSquadButton({ withinQuota, orgSlug }: CreateSquadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!withinQuota) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button disabled size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Time
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Você atingiu o limite de times do seu plano. Faça upgrade para criar
          mais.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo Time
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <UpsertSquadSheetContent
          orgSlug={orgSlug}
          setIsOpen={setIsOpen}
        />
      </Sheet>
    </>
  )
}
