'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'

interface TaskOutcomeIntroTriggerProps {
  hasSeenTaskOutcomeIntro: boolean
}

export function TaskOutcomeIntroTrigger({
  hasSeenTaskOutcomeIntro,
}: TaskOutcomeIntroTriggerProps) {
  const [open, setOpen] = useState(!hasSeenTaskOutcomeIntro)
  const { execute } = useAction(completeTutorial)

  if (hasSeenTaskOutcomeIntro) return null

  const tutorial = TUTORIAL_REGISTRY.find((t) => t.id === 'task-outcome-intro')!

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      execute({ tutorialId: 'task-outcome-intro' })
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
