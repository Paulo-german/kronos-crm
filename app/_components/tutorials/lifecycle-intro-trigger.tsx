'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'

interface LifecycleIntroTriggerProps {
  hasSeenLifecycleIntro: boolean
}

export function LifecycleIntroTrigger({
  hasSeenLifecycleIntro,
}: LifecycleIntroTriggerProps) {
  const [open, setOpen] = useState(!hasSeenLifecycleIntro)
  const { execute } = useAction(completeTutorial)

  // Usuário já viu — não renderiza nada
  if (hasSeenLifecycleIntro) return null

  const tutorial = TUTORIAL_REGISTRY.find((t) => t.id === 'lifecycle-intro')!

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Marca como visto ao fechar (via X ou Concluir)
      execute({ tutorialId: 'lifecycle-intro' })
    }
    setOpen(nextOpen)
  }

  return (
    <TutorialModal
      tutorial={tutorial}
      open={open}
      onOpenChange={handleOpenChange}
      // isCompleted=true permite fechar a qualquer momento (mostra botão X e responde ao ESC)
      isCompleted={true}
    />
  )
}
