'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { TutorialModal } from './tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'

interface LifecycleAnnouncementBannerProps {
  hasSeenLifecycleIntro: boolean
}

export function LifecycleAnnouncementBanner({
  hasSeenLifecycleIntro,
}: LifecycleAnnouncementBannerProps) {
  const [visible, setVisible] = useState(!hasSeenLifecycleIntro)
  const [modalOpen, setModalOpen] = useState(false)
  const { execute } = useAction(completeTutorial)

  if (!visible) return null

  const tutorial = TUTORIAL_REGISTRY.find(
    (tutorial) => tutorial.id === 'lifecycle-intro',
  )!

  const handleDismiss = () => {
    execute({ tutorialId: 'lifecycle-intro' })
    setVisible(false)
  }

  const handleModalChange = (nextOpen: boolean) => {
    setModalOpen(nextOpen)
    if (!nextOpen) {
      // Marca como visto ao fechar o modal (via X ou Concluir)
      execute({ tutorialId: 'lifecycle-intro' })
      setVisible(false)
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="flex-1 text-sm text-foreground">
          <span className="font-semibold">Novidade:</span> o Ciclo de Vida dos
          Contatos chegou — acompanhe cada cliente da captação ao fechamento.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => setModalOpen(true)}
        >
          Ver novidade
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Fechar banner"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <TutorialModal
        tutorial={tutorial}
        open={modalOpen}
        onOpenChange={handleModalChange}
        isCompleted={true}
      />
    </>
  )
}
