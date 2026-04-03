'use client'

import { useState } from 'react'
import { GraduationCap, CheckCircle2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'

interface TutorialTriggerButtonProps {
  tutorialId: string
  isCompleted: boolean
}

export const TutorialTriggerButton = ({
  tutorialId,
  isCompleted,
}: TutorialTriggerButtonProps) => {
  const [open, setOpen] = useState(false)

  const tutorial = TUTORIAL_REGISTRY.find(
    (entry) => entry.id === tutorialId,
  )

  // Early return se o tutorial não existe no registry
  if (!tutorial) return null

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              className="relative gap-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Ver tutorial"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Tutorial</span>

              {/* Badge de concluído — check verde no canto do ícone */}
              {isCompleted && (
                <CheckCircle2 className="absolute -right-0.5 -top-0.5 h-3 w-3 fill-emerald-500 text-background" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCompleted ? 'Rever tutorial' : 'Ver tutorial'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TutorialModal
        tutorial={tutorial}
        open={open}
        onOpenChange={setOpen}
        isCompleted={isCompleted}
      />
    </>
  )
}
