'use client'

import { GraduationCap } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { TUTORIAL_ICON_MAP } from '@/_lib/tutorials/tutorial-icon-map'

interface TutorialPlaceholderProps {
  icon: string
  className?: string
}

export const TutorialPlaceholder = ({
  icon,
  className,
}: TutorialPlaceholderProps) => {
  const IconComponent = TUTORIAL_ICON_MAP[icon] ?? GraduationCap

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-primary/30">
        <IconComponent className="h-16 w-16" />
        <p className="text-xs text-muted-foreground/50">
          Imagem em breve
        </p>
      </div>
    </div>
  )
}
