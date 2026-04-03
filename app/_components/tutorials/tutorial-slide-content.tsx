'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { TutorialSlide } from '@/_lib/tutorials/tutorial-types'
import { TutorialPlaceholder } from './tutorial-placeholder'
import { TUTORIAL_COMPONENT_MAP } from './slides/tutorial-component-map'

interface TutorialSlideContentProps {
  content: TutorialSlide['content']
  icon: string
  isPriority?: boolean
  title?: string
  description?: string
}

export const TutorialSlideContent = ({
  content,
  icon,
  isPriority = false,
  title,
  description,
}: TutorialSlideContentProps) => {
  const [imageError, setImageError] = useState(false)

  if (content.type === 'image') {
    if (imageError) {
      return (
        <TutorialPlaceholder icon={icon} className="h-full w-full rounded-lg" />
      )
    }

    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg">
        <Image
          src={content.src}
          alt="Ilustração do tutorial"
          fill
          sizes="(max-width: 640px) 100vw, 560px"
          className="object-cover"
          priority={isPriority}
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  if (content.type === 'video') {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
        <video
          src={content.src}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    )
  }

  // type === 'component' — layout side-by-side: esquerda (texto + legendas) | direita (componente)
  const entry = TUTORIAL_COMPONENT_MAP[content.componentId]

  if (!entry) {
    return (
      <TutorialPlaceholder icon={icon} className="h-full w-full rounded-lg" />
    )
  }

  const { component: Component, sidebar: Sidebar } = entry

  return (
    <div className="flex h-full w-full items-stretch gap-4">
      {/* Coluna esquerda: título + descrição + sidebar (dentro do gradient) */}
      <div className="flex flex-1 flex-col justify-center gap-5 rounded-lg bg-background px-5 py-4">
        {title && (
          <div className="space-y-1.5">
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {Sidebar && <Sidebar />}
      </div>

      {/* Coluna direita: componente (fora do gradient) */}
      <div className="flex flex-1 items-center justify-center px-4">
        <Component />
      </div>
    </div>
  )
}
