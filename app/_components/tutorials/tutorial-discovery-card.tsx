'use client'

import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Play,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { TUTORIAL_ICON_MAP } from '@/_lib/tutorials/tutorial-icon-map'
import type { TutorialDefinition } from '@/_lib/tutorials/tutorial-types'

interface TutorialDiscoveryCardProps {
  tutorial: TutorialDefinition
  isCompleted: boolean
  onOpen: () => void
}

export const TutorialDiscoveryCard = ({
  tutorial,
  isCompleted,
  onOpen,
}: TutorialDiscoveryCardProps) => {
  const IconComponent = TUTORIAL_ICON_MAP[tutorial.icon] ?? GraduationCap

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <IconComponent className="h-5 w-5" />
          </div>

          {isCompleted ? (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              Concluído
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {tutorial.estimatedMinutes} min
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-foreground leading-tight">
            {tutorial.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tutorial.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Play className="h-3 w-3 fill-current" />
          <span>{tutorial.slides.length} slides</span>
          {isCompleted && (
            <>
              <span>&middot;</span>
              <span className="text-emerald-600 dark:text-emerald-400">Ver novamente</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
