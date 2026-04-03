'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { GraduationCap, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { SlideContainer } from '@/_components/slides/slide-container'
import { SlideProgress } from '@/_components/slides/slide-progress'
import { TutorialSlideContent } from './tutorial-slide-content'
import { completeTutorial } from '@/_actions/tutorial/complete-tutorial'
import type { TutorialDefinition } from '@/_lib/tutorials/tutorial-types'

interface TutorialModalProps {
  tutorial: TutorialDefinition
  open: boolean
  onOpenChange: (open: boolean) => void
  isCompleted: boolean
}

export const TutorialModal = ({
  tutorial,
  open,
  onOpenChange,
  isCompleted,
}: TutorialModalProps) => {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const totalSteps = tutorial.slides.length
  const currentSlide = tutorial.slides[step]
  const isFirst = step === 0
  const isLast = step === totalSteps - 1

  const { execute, isPending } = useAction(completeTutorial, {
    onSuccess: () => {
      toast.success('Tutorial concluído! Continue explorando o Kronos.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? 'Erro ao registrar conclusão. Tente novamente.',
      )
    },
  })

  const handleBack = () => {
    setDirection(-1)
    setStep((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    if (!isLast) {
      setDirection(1)
      setStep((prev) => prev + 1)
      return
    }

    // Re-visita: apenas fecha o modal sem chamar action novamente
    if (isCompleted) {
      handleOpenChange(false)
      return
    }

    // Primeira vez no último slide: registra conclusão no banco
    execute({ tutorialId: tutorial.id })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Modal é bloqueante na primeira vez — só permite fechar ao re-visitar
    if (!nextOpen && !isCompleted) return
    if (!nextOpen) {
      // Reseta o step ao fechar para que a próxima re-visita comece do início
      setStep(0)
      setDirection(1)
    }
    onOpenChange(nextOpen)
  }

  const slides = tutorial.slides.map((slide, index) => {
    // Slides do tipo 'component' controlam seu próprio layout (texto + visual lado a lado)
    if (slide.content.type === 'component') {
      return (
        <div key={index} className="h-[50vh]">
          <TutorialSlideContent
            content={slide.content}
            icon={tutorial.icon}
            isPriority={index === 0}
            title={slide.title}
            description={slide.description}
          />
        </div>
      )
    }

    return (
      <div key={index} className="flex flex-col gap-4">
        {/* Área de conteúdo rico — imagem/vídeo */}
        <div className="relative h-[40vh] w-full overflow-hidden rounded-lg">
          <TutorialSlideContent
            content={slide.content}
            icon={tutorial.icon}
            isPriority={index === 0}
          />
        </div>

        {/* Título e descrição do slide */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-semibold text-foreground">
            {slide.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {slide.description}
          </p>
        </div>
      </div>
    )
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-3xl gap-0 overflow-hidden p-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:rounded-lg [&>button:last-child]:hidden"
        onPointerDownOutside={(event) => {
          // Bloqueia clique fora apenas quando não é re-visita
          if (!isCompleted) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          // Bloqueia ESC apenas quando não é re-visita
          if (!isCompleted) event.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">{tutorial.title}</DialogTitle>

        {/* Header com gradiente e branding */}
        <div className="relative flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {tutorial.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {tutorial.estimatedMinutes} min &middot; {totalSteps} slides
            </p>
          </div>

          {/* Botão de fechar visível apenas na re-visita (isCompleted=true) */}
          {isCompleted && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleOpenChange(false)}
              className="absolute right-3 top-1/2 h-7 w-7 -translate-y-1/2"
              aria-label="Fechar tutorial"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Conteúdo dos slides com animação */}
        <div className="px-6 py-5">
          <SlideContainer currentStep={step} direction={direction}>
            {slides}
          </SlideContainer>
        </div>

        {/* Footer: dots de progresso + botões de navegação */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <SlideProgress currentStep={step} totalSteps={totalSteps} />

          {/* Botões de navegação — layout manual para suportar o "Pular" entre Voltar e Avançar */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isPending}
              >
                Voltar
              </Button>
            )}

            {/* "Pular" aparece apenas quando o step atual tem skippable=true E não é o último */}
            {currentSlide.skippable === true && !isLast && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleNext}
                disabled={isPending}
              >
                Pular
              </Button>
            )}

            <Button type="button" onClick={handleNext} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLast ? 'Concluir' : 'Avançar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
