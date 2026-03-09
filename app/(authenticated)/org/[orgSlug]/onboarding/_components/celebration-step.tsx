'use client'

import { useEffect, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { motion } from 'framer-motion'
import { PartyPopper, Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { fireConfetti } from '@/_lib/onboarding/fire-confetti'
import { completeOnboarding } from '@/_actions/onboarding/complete-onboarding'

interface CelebrationStepProps {
  onStart: () => void
}

export function CelebrationStep({ onStart }: CelebrationStepProps) {
  const hasTriggered = useRef(false)

  const { execute, isPending } = useAction(completeOnboarding, {
    onSuccess: () => {
      onStart()
    },
  })

  useEffect(() => {
    if (hasTriggered.current) return
    hasTriggered.current = true
    fireConfetti()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      >
        <PartyPopper className="size-16 text-primary" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-3xl font-bold tracking-tight"
      >
        Tudo pronto!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 max-w-md text-muted-foreground"
      >
        Seu CRM está configurado e pronto para uso. Vamos começar?
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8"
      >
        <Button
          size="lg"
          onClick={() => execute()}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Começar a usar o Kronos
        </Button>
      </motion.div>
    </div>
  )
}
