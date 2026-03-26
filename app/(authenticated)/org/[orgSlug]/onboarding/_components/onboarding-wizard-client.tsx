'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import type { OnboardingStatus } from '@/_data-access/organization/get-onboarding-status'
import { useOnboardingParams } from '../_lib/use-onboarding-params'
import { OnboardingStepper } from './onboarding-stepper'
import { ConversationStep } from './conversation-step'
import { ConfigReviewStep } from './config-review-step'
import { AgentReviewStep } from './agent-review-step'
import { WhatsappStep } from './whatsapp-step'
import { CelebrationStep } from './celebration-step'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { ConfigBundle } from '@/_lib/onboarding/schemas/config-bundle'
import type { AgentStepsOutput } from '@/_lib/onboarding/schemas/agent-output'
import { markTourPending } from '@/_lib/onboarding/tours/tour-utils'
import { saveMainTourContext } from '@/_lib/onboarding/tours/main-tour'

// localStorage keys para dados grandes (estado transiente do wizard)
const LS_ORG_SLUG = 'kronos_onb_org_slug'
const LS_BUSINESS_PROFILE = 'kronos_onb_business_profile'
const LS_CONFIG_BUNDLE = 'kronos_onb_config_bundle'
const LS_SYSTEM_PROMPT = 'kronos_onb_system_prompt'
const LS_AGENT_STEPS = 'kronos_onb_agent_steps'

const ALL_LS_KEYS = [
  LS_ORG_SLUG,
  LS_BUSINESS_PROFILE,
  LS_CONFIG_BUNDLE,
  LS_SYSTEM_PROMPT,
  LS_AGENT_STEPS,
  'kronos_onb_config_task_id',
  'kronos_onb_prompt_task_id',
  'kronos_onb_steps_task_id',
]

/**
 * Limpa dados de onboarding se pertencerem a outra org.
 * Garante isolamento entre orgs no mesmo browser.
 */
function ensureOrgIsolation(currentSlug: string) {
  if (typeof window === 'undefined') return

  const storedSlug = localStorage.getItem(LS_ORG_SLUG)

  if (storedSlug && storedSlug !== currentSlug) {
    for (const key of ALL_LS_KEYS) {
      localStorage.removeItem(key)
    }
  }

  localStorage.setItem(LS_ORG_SLUG, currentSlug)
}

type AgentStepBlueprint = AgentStepsOutput['steps'][number]

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

interface OnboardingWizardClientProps {
  initialStatus: OnboardingStatus
  orgSlug: string
}

function readFromLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function OnboardingWizardClient({
  initialStatus,
  orgSlug,
}: OnboardingWizardClientProps) {
  const router = useRouter()
  const [direction, setDirection] = useState(1)

  // Limpa localStorage se os dados forem de outra org
  ensureOrgIsolation(orgSlug)

  // Estado persistido em localStorage (dados grandes)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
    () => readFromLocalStorage<BusinessProfile>(LS_BUSINESS_PROFILE),
  )
  const [configBundle, setConfigBundle] = useState<ConfigBundle | null>(
    () => readFromLocalStorage<ConfigBundle>(LS_CONFIG_BUNDLE),
  )
  const [systemPrompt, setSystemPrompt] = useState<string | null>(
    () => readFromLocalStorage<string>(LS_SYSTEM_PROMPT),
  )
  const [agentSteps, setAgentSteps] = useState<AgentStepBlueprint[] | null>(
    () => readFromLocalStorage<AgentStepBlueprint[]>(LS_AGENT_STEPS),
  )

  const {
    step,
    setStep,
    inboxId,
    setInboxId,
    setWhatsappConnected,
    setConfigApproved,
    setAgentApproved,
  } = useOnboardingParams(initialStatus)

  // Sync businessProfile no localStorage (uso valido: sync com sistema externo)
  useEffect(() => {
    if (businessProfile) {
      localStorage.setItem(LS_BUSINESS_PROFILE, JSON.stringify(businessProfile))
    }
  }, [businessProfile])

  // Sync configBundle no localStorage
  useEffect(() => {
    if (configBundle) {
      localStorage.setItem(LS_CONFIG_BUNDLE, JSON.stringify(configBundle))
    }
  }, [configBundle])

  // Step 0: Conversa com IA → Step 1
  const handleConversationComplete = useCallback(
    (profile: BusinessProfile) => {
      setBusinessProfile(profile)
      setDirection(1)
      setStep(1)
    },
    [setStep],
  )

  // Step 1: Config Review → Step 2
  const handleConfigComplete = useCallback(
    (bundle: ConfigBundle) => {
      setConfigBundle(bundle)
      setConfigApproved(true)
      setDirection(1)
      setStep(2)
    },
    [setStep, setConfigApproved],
  )

  // Step 2: Agent Review → Step 3
  const handleAgentComplete = useCallback(() => {
    // Dados do localStorage de systemPrompt e agentSteps
    const savedPrompt = readFromLocalStorage<string>(LS_SYSTEM_PROMPT)
    const savedSteps = readFromLocalStorage<AgentStepBlueprint[]>(LS_AGENT_STEPS)
    if (savedPrompt) setSystemPrompt(savedPrompt)
    if (savedSteps) setAgentSteps(savedSteps)

    setAgentApproved(true)
    setDirection(1)
    setStep(3)
  }, [setStep, setAgentApproved])

  // Step 3: WhatsApp → Step 4
  const handleWhatsappComplete = useCallback(() => {
    setWhatsappConnected(true)
    setDirection(1)
    setStep(4)
  }, [setWhatsappConnected, setStep])

  const handleSkipWhatsapp = useCallback(() => {
    setDirection(1)
    setStep(4)
  }, [setStep])

  // Step 4: Celebracao → Dashboard
  const handleStartCrm = useCallback(() => {
    // Salvar contexto do tour principal antes de limpar localStorage
    const savedProfile = readFromLocalStorage<BusinessProfile>(LS_BUSINESS_PROFILE)
    const savedConfig = readFromLocalStorage<ConfigBundle>(LS_CONFIG_BUNDLE)

    saveMainTourContext({
      companyName: savedProfile?.companyName ?? 'sua empresa',
      agentName: savedProfile?.agentName ?? null,
      hasWhatsapp: initialStatus.hasInbox,
      pipelineStages: savedConfig?.pipelineStages.map((stage) => stage.name) ?? [],
    })
    markTourPending('main')

    // Limpar todo o localStorage do onboarding
    for (const key of ALL_LS_KEYS) {
      localStorage.removeItem(key)
    }

    router.push(`/org/${orgSlug}/dashboard`)
  }, [router, orgSlug, initialStatus.hasInbox])

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

  // Step 4 (celebracao) nao mostra stepper
  const showStepper = step < 4
  // Botao voltar disponivel nos steps 1-3
  const showBackButton = step > 0 && step < 4

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <Link
          href={`/org/${orgSlug}`}
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <KronosLogo />
          <span className="text-xl font-bold tracking-tight">KRONOS</span>
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center px-4 pt-6">
        {showStepper && (
          <div className="mb-6 w-full shrink-0">
            <OnboardingStepper currentStep={step} />
          </div>
        )}

        <div className="w-full min-h-0 flex-1 max-w-4xl overflow-y-auto">
          {showBackButton && (
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
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex h-full flex-col"
            >
              {/* Step 0: Conversa com IA */}
              {step === 0 && (
                <ConversationStep
                  onComplete={handleConversationComplete}
                  initialProfile={businessProfile}
                />
              )}

              {/* Step 1: Revisao de configuracao */}
              {step === 1 && businessProfile && (
                <ConfigReviewStep
                  businessProfile={businessProfile}
                  initialConfigBundle={configBundle}
                  onComplete={handleConfigComplete}
                  onBack={handleBack}
                />
              )}

              {/* Step 2: Revisao do agente */}
              {step === 2 && businessProfile && configBundle && (
                <AgentReviewStep
                  businessProfile={businessProfile}
                  configBundle={configBundle}
                  initialSystemPrompt={systemPrompt}
                  initialAgentSteps={agentSteps}
                  onComplete={handleAgentComplete}
                  onBack={handleBack}
                />
              )}

              {/* Step 3: Conexao WhatsApp (inalterado) */}
              {step === 3 && (
                <WhatsappStep
                  onComplete={handleWhatsappComplete}
                  onSkip={handleSkipWhatsapp}
                  initialInboxId={inboxId}
                  onInboxIdChange={handleInboxIdChange}
                />
              )}

              {/* Step 4: Celebracao (inalterado) */}
              {step === 4 && (
                <CelebrationStep onStart={handleStartCrm} />
              )}

              {/* Fallback: step 1/2 sem dados — voltar ao inicio */}
              {step === 1 && !businessProfile && (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-muted-foreground">
                    Sessão expirada. Por favor, reinicie o onboarding.
                  </p>
                  <Button onClick={() => setStep(0)}>Reiniciar</Button>
                </div>
              )}

              {step === 2 && (!businessProfile || !configBundle) && (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-muted-foreground">
                    Sessão expirada. Por favor, reinicie o onboarding.
                  </p>
                  <Button onClick={() => setStep(0)}>Reiniciar</Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
