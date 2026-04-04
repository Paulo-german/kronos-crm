'use client'

import { useState, useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/_components/ui/dialog'
import { SlideContainer } from '@/_components/slides/slide-container'
import { SlideProgress } from '@/_components/slides/slide-progress'
import { SlideNavigation } from '@/_components/slides/slide-navigation'
import { ProfileStep } from '@/_components/welcome-survey/steps/profile-step'
import { OperationStep } from '@/_components/welcome-survey/steps/operation-step'
import { ReferralStep } from '@/_components/welcome-survey/steps/referral-step'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { submitWelcomeSurvey } from '@/_actions/survey/submit-welcome-survey'
import type { SubmitWelcomeSurveyInput } from '@/_actions/survey/submit-welcome-survey/schema'

type SurveyData = Partial<SubmitWelcomeSurveyInput>

const TOTAL_STEPS = 3
const DELAY_MS = 2 * 60 * 1000 // 2 minutos

export const WelcomeSurveyModal = () => {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [data, setData] = useState<SurveyData>({})

  // Delay de 2 minutos antes de exibir o modal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const { execute, isPending } = useAction(submitWelcomeSurvey, {
    onSuccess: () => {
      toast.success('Obrigado por responder!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar. Tente novamente.')
    },
  })

  const canAdvance = (() => {
    if (step === 0) return !!data.role && !!data.teamSize
    if (step === 1) return !!data.crmExperience && !!data.mainChallenge
    if (step === 2) return !!data.referralSource
    return false
  })()

  const handleBack = () => {
    setDirection(-1)
    setStep((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep((prev) => prev + 1)
      return
    }

    const payload = data as SubmitWelcomeSurveyInput
    execute(payload)
  }

  const steps = [
    <ProfileStep
      key="profile"
      role={data.role}
      teamSize={data.teamSize}
      onSelectRole={(value) =>
        setData((prev) => ({ ...prev, role: value }) as SurveyData)
      }
      onSelectTeamSize={(value) =>
        setData((prev) => ({ ...prev, teamSize: value }) as SurveyData)
      }
    />,
    <OperationStep
      key="operation"
      crmExperience={data.crmExperience}
      mainChallenge={data.mainChallenge}
      onSelectCrmExperience={(value) =>
        setData((prev) => ({ ...prev, crmExperience: value }) as SurveyData)
      }
      onSelectMainChallenge={(value) =>
        setData((prev) => ({ ...prev, mainChallenge: value }) as SurveyData)
      }
    />,
    <ReferralStep
      key="referral"
      value={data.referralSource}
      onSelect={(value) =>
        setData((prev) => ({ ...prev, referralSource: value }) as SurveyData)
      }
    />,
  ]

  return (
    <Dialog open={visible}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-lg sm:rounded-lg outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [&>button:last-child]:hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">
          Questionário de boas-vindas
        </DialogTitle>

        {/* Header com gradiente e branding */}
        <div className="relative flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KronosLogo className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Bem-vindo(a) à Kronos Hub
            </p>
            <p className="text-xs text-muted-foreground">
              Responda algumas perguntas para que possamos te conhecer melhor
            </p>
          </div>
        </div>

        {/* Conteúdo dos slides */}
        <div className="px-6 py-5">
          <SlideContainer currentStep={step} direction={direction}>
            {steps}
          </SlideContainer>
        </div>

        {/* Footer com progress + navegação */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <SlideProgress currentStep={step} totalSteps={TOTAL_STEPS} />
          <SlideNavigation
            onBack={handleBack}
            onNext={handleNext}
            isFirst={step === 0}
            isLast={step === TOTAL_STEPS - 1}
            canAdvance={canAdvance}
            isSubmitting={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
