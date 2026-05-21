'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'

interface AgentDetailIntroTriggerProps {
  hasSeenAgentDetailIntro: boolean
}

export function AgentDetailIntroTrigger({ hasSeenAgentDetailIntro }: AgentDetailIntroTriggerProps) {
  const [open, setOpen] = useState(!hasSeenAgentDetailIntro)
  const { execute } = useAction(completeTutorial)

  if (hasSeenAgentDetailIntro) return null

  const tutorial = TUTORIAL_REGISTRY.find((t) => t.id === 'agent-detail')!

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      execute({ tutorialId: 'agent-detail' })
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
