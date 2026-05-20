'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'

interface AgentsListIntroTriggerProps {
  hasSeenAgentsListIntro: boolean
}

export function AgentsListIntroTrigger({ hasSeenAgentsListIntro }: AgentsListIntroTriggerProps) {
  const [open, setOpen] = useState(!hasSeenAgentsListIntro)
  const { execute } = useAction(completeTutorial)

  if (hasSeenAgentsListIntro) return null

  const tutorial = TUTORIAL_REGISTRY.find((t) => t.id === 'agents-list')!

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      execute({ tutorialId: 'agents-list' })
    }
    setOpen(nextOpen)
  }

  return (
    <TutorialModal
      tutorial={tutorial}
      open={open}
      onOpenChange={handleOpenChange}
      isCompleted={true}
    />
  )
}
