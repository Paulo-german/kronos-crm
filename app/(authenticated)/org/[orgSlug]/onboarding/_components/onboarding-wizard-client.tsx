'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import type { OnboardingStatus } from '@/_data-access/organization/get-onboarding-status'
import { useOnboardingParams } from '../_lib/use-onboarding-params'
import { OnboardingStepper } from './onboarding-stepper'
import { NicheStep } from './niche-step'
import { WhatsappStep } from './whatsapp-step'
import { SetupStep } from './setup-step'
import { CelebrationStep } from './celebration-step'

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
}

interface OnboardingWizardClientProps {
  initialStatus: OnboardingStatus
  orgSlug: string
}

export function OnboardingWizardClient({
  initialStatus,
  orgSlug,
}: OnboardingWizardClientProps) {
  const router = useRouter()
  const [direction, setDirection] = useState(1)

  const {
    step,
    setStep,
    niche,
    setNiche,
    inboxId,
    setInboxId,
    setWhatsappConnected,
  } = useOnboardingParams(initialStatus)

  const handleNicheComplete = useCallback(
    (selectedNiche: string) => {
      setNiche(selectedNiche)
      setDirection(1)
      setStep(1)
    },
    [setNiche, setStep],
  )

  const handleWhatsappComplete = useCallback(() => {
    setWhatsappConnected(true)
    setDirection(1)
    setStep(2)
  }, [setWhatsappConnected, setStep])

  const handleSkipWhatsapp = useCallback(() => {
    router.push(`/org/${orgSlug}/crm/deals/pipeline`)
  }, [router, orgSlug])

  const handleSetupComplete = useCallback(() => {
    setDirection(1)
    setStep(3)
  }, [setStep])

  const handleStartCrm = useCallback(() => {
    router.push(`/org/${orgSlug}/dashboard?from=onboarding`)
  }, [router, orgSlug])

  const handleBack = useCallback(() => {
    if (step <= 0) return
    setDirection(-1)
    setStep(step - 1)
  }, [step, setStep])

  const handleInboxIdChange = useCallback(
    (id: string) => {
      setInboxId(id)
    },
    [setInboxId],
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center border-b px-6">
        <Link
          href={`/org/${orgSlug}`}
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <KronosLogo />
          <span className="text-xl font-bold tracking-tight">KRONOS</span>
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center px-4 py-10">
        {step < 3 && (
          <div className="mb-10 w-full">
            <OnboardingStepper currentStep={step} />
          </div>
        )}

        <div className="w-full max-w-4xl overflow-hidden">
          {step > 0 && step < 3 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-1.5 text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {step === 0 && (
                <NicheStep
                  onComplete={handleNicheComplete}
                  initialNiche={niche}
                />
              )}
              {step === 1 && (
                <WhatsappStep
                  onComplete={handleWhatsappComplete}
                  onSkip={handleSkipWhatsapp}
                  initialInboxId={inboxId}
                  onInboxIdChange={handleInboxIdChange}
                />
              )}
              {step === 2 && (
                <SetupStep onComplete={handleSetupComplete} />
              )}
              {step === 3 && (
                <CelebrationStep onStart={handleStartCrm} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
