'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Play,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { Separator } from '@/_components/ui/separator'
import { Progress } from '@/_components/ui/progress'
import { TutorialModal } from '@/_components/tutorials/tutorial-modal'
import { TUTORIAL_REGISTRY } from '@/_lib/tutorials/tutorial-registry'
import { TUTORIAL_ICON_MAP } from '@/_lib/tutorials/tutorial-icon-map'

interface TutorialsPopoverButtonProps {
  completedTutorialIds: string[]
  orgSlug: string
}

export const TutorialsPopoverButton = ({
  completedTutorialIds,
  orgSlug,
}: TutorialsPopoverButtonProps) => {
  const [open, setOpen] = useState(false)
  const [openTutorialId, setOpenTutorialId] = useState<string | null>(null)

  const totalCount = TUTORIAL_REGISTRY.length
  const completedCount = completedTutorialIds.length
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const activeTutorial = openTutorialId
    ? (TUTORIAL_REGISTRY.find((tutorial) => tutorial.id === openTutorialId) ??
      null)
    : null

  const handleOpenTutorial = (tutorialId: string) => {
    setOpen(false)
    setOpenTutorialId(tutorialId)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Tutoriais"
          >
            <BookOpen className="size-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-0">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Tutoriais</h4>
              <span className="text-xs text-muted-foreground">
                {completedCount} de {totalCount} concluídos
              </span>
            </div>
            <Progress value={progressPercent} className="mt-2 h-1.5" />
          </div>

          <Separator />

          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {TUTORIAL_REGISTRY.map((tutorial) => {
                const isCompleted = completedTutorialIds.includes(tutorial.id)
                const IconComponent =
                  TUTORIAL_ICON_MAP[tutorial.icon] ?? GraduationCap

                return (
                  <button
                    key={tutorial.id}
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() => handleOpenTutorial(tutorial.id)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {tutorial.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Concluído
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>{tutorial.estimatedMinutes} min</span>
                          </>
                        )}
                        <span>&middot;</span>
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>{tutorial.slides.length} slides</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>

          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              asChild
              onClick={() => setOpen(false)}
            >
              <Link href={`/org/${orgSlug}/tutorials`}>
                Ver todos os tutoriais
              </Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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
    </>
  )
}
