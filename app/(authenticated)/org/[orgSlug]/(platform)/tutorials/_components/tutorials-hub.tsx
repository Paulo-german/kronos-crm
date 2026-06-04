'use client'

import { useState } from 'react'
import { Progress } from '@/_components/ui/progress'
import { TutorialDiscoveryCard } from '@/_components/tutorials/tutorial-discovery-card'
import { TutorialModal } from '@/_components/tutorials/tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'

interface TutorialsHubProps {
  completedTutorialIds: string[]
}

export const TutorialsHub = ({ completedTutorialIds }: TutorialsHubProps) => {
  const [openTutorialId, setOpenTutorialId] = useState<string | null>(null)

  // Filtra getting_started primeiro, depois os demais
  const gettingStarted = TUTORIAL_REGISTRY.filter(
    (tutorial) => tutorial.category === 'getting_started',
  )
  const advanced = TUTORIAL_REGISTRY.filter(
    (tutorial) => tutorial.category === 'advanced',
  )
  const orderedTutorials = [...gettingStarted, ...advanced]

  const totalCount = orderedTutorials.length
  const completedCount = completedTutorialIds.length
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const activeTutorial = openTutorialId
    ? TUTORIAL_REGISTRY.find((tutorial) => tutorial.id === openTutorialId) ?? null
    : null

  return (
    <div className="space-y-6">
      {/* Barra de progresso geral */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso geral</span>
          <span className="font-medium text-foreground">
            {completedCount} de {totalCount} concluídos
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Grid de cards de tutoriais */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {orderedTutorials.map((tutorial) => (
          <TutorialDiscoveryCard
            key={tutorial.id}
            tutorial={tutorial}
            isCompleted={completedTutorialIds.includes(tutorial.id)}
            onOpen={() => setOpenTutorialId(tutorial.id)}
          />
        ))}
      </div>

      {/* Modal do tutorial selecionado */}
      {activeTutorial && (
        <TutorialModal
          tutorial={activeTutorial}
          open={openTutorialId !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setOpenTutorialId(null)
          }}
          isCompleted={completedTutorialIds.includes(activeTutorial.id)}
        />
      )}
    </div>
  )
}
