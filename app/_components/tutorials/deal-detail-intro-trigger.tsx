'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'

interface DealDetailIntroTriggerProps {
  hasSeenDealDetailIntro: boolean
}

export function DealDetailIntroTrigger({ hasSeenDealDetailIntro }: DealDetailIntroTriggerProps) {
  const [open, setOpen] = useState(!hasSeenDealDetailIntro)
  const { execute } = useAction(completeTutorial)

  if (hasSeenDealDetailIntro) return null

  const tutorial = TUTORIAL_REGISTRY.find((t) => t.id === 'deal-details')!

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      execute({ tutorialId: 'deal-details' })
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
