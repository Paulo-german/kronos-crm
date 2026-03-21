'use client'

import { useEffect, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { motion } from 'framer-motion'
import {
  Rocket,
  Loader2,
  MessageSquare,
  BarChart3,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { fireConfetti } from '@/_lib/onboarding/fire-confetti'
import { completeOnboarding } from '@/_actions/onboarding/complete-onboarding'

interface CelebrationStepProps {
  onStart: () => void
}

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Agente IA configurado',
    description: 'Seu assistente virtual está pronto pra atender no WhatsApp',
  },
  {
    icon: BarChart3,
    title: 'Pipeline personalizado',
    description: 'Funil de vendas montado pro seu processo comercial',
  },
  {
    icon: Users,
    title: 'CRM completo',
    description: 'Contatos, negócios e tarefas organizados pra sua equipe',
  },
  {
    icon: Zap,
    title: 'Automações ativas',
    description: 'Etapas de atendimento com ações automáticas configuradas',
  },
]

export function CelebrationStep({ onStart }: CelebrationStepProps) {
  const hasTriggered = useRef(false)

  const { execute, isPending } = useAction(completeOnboarding)

  useEffect(() => {
    if (hasTriggered.current) return
    hasTriggered.current = true
    fireConfetti()

    // Segundo burst de confetti com delay
    const timeout = setTimeout(() => {
      fireConfetti()
    }, 800)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Icone principal com glow */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="relative"
      >
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Rocket className="size-12 text-primary-foreground" />
        </div>
      </motion.div>

      {/* Titulo */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-4xl font-bold tracking-tight"
      >
        Tudo pronto!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 max-w-lg text-lg text-muted-foreground"
      >
        A sua conta na Kronos Hub está configurada e personalizada para o seu
        negócio.
      </motion.p>

      {/* Grid de features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-10 grid w-full max-w-lg grid-cols-2 gap-3"
      >
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <feature.icon className="size-5 text-primary" />
            </div>
            <span className="text-sm font-semibold">{feature.title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {feature.description}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Botao */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-10"
      >
        <Button
          size="lg"
          onClick={() => {
            onStart()
            execute()
          }}
          disabled={isPending}
          className="gap-2 px-8 text-base shadow-lg shadow-primary/20"
        >
          {isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Rocket className="size-5" />
          )}
          {isPending ? 'Preparando...' : 'Começar a usar o Kronos'}
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-4 text-xs text-muted-foreground/60"
      >
        Você pode ajustar todas as configurações depois nas configurações do
        agente.
      </motion.p>
    </div>
  )
}
