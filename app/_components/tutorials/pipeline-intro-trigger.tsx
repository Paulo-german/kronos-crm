'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'

interface PipelineIntroTriggerProps {
  hasSeenPipelineIntro: boolean
}

export function PipelineIntroTrigger({
  hasSeenPipelineIntro,
}: PipelineIntroTriggerProps) {
  const [open, setOpen] = useState(!hasSeenPipelineIntro)
  const { execute } = useAction(completeTutorial)

  if (hasSeenPipelineIntro) return null

  const tutorial = TUTORIAL_REGISTRY.find(
    (tutorial) => tutorial.id === 'pipeline',
  )!

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      execute({ tutorialId: 'pipeline' })
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
