'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical,
  ArrowRight as ArrowRightIcon,
  TrendingUp as TrendingUpIcon,
  CheckSquare as CheckSquareIcon,
  UserCheck as UserCheckIcon,
} from 'lucide-react'

const STEPS = [
  {
    number: 1,
    name: 'Qualificação',
    description: 'Agente faz perguntas para entender o lead',
    actions: [
      { label: 'Mover etapa', icon: ArrowRightIcon, color: 'bg-indigo-500/10 text-indigo-500' },
      { label: 'Avançar ciclo', icon: TrendingUpIcon, color: 'bg-kronos-purple/10 text-kronos-purple' },
    ],
    activeBorder: 'border-l-indigo-500',
    activeBg: 'bg-indigo-500/5',
  },
  {
    number: 2,
    name: 'Apresentação',
    description: 'Apresenta o produto e tira dúvidas',
    actions: [
      { label: 'Criar tarefa', icon: CheckSquareIcon, color: 'bg-kronos-green/10 text-kronos-green' },
    ],
    activeBorder: 'border-l-kronos-green',
    activeBg: 'bg-kronos-green/5',
  },
  {
    number: 3,
    name: 'Encerramento',
    description: 'Direciona para vendedor quando qualificado',
    actions: [
      { label: 'Hand-off', icon: UserCheckIcon, color: 'bg-destructive/10 text-destructive' },
      { label: 'Criar tarefa', icon: CheckSquareIcon, color: 'bg-kronos-green/10 text-kronos-green' },
    ],
    activeBorder: 'border-l-destructive',
    activeBg: 'bg-destructive/5',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
}

export const AgentDetailProcessSlide = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setActiveIndex(0)
    }, 1200)
    return () => clearTimeout(initialTimer)
  }, [])

  useEffect(() => {
    if (activeIndex === null) return
    const cycleTimer = setTimeout(() => {
      setActiveIndex((prev) => (prev === null ? 0 : (prev + 1) % STEPS.length))
    }, 2000)
    return () => clearTimeout(cycleTimer)
  }, [activeIndex])

  return (
    <motion.div
      className="w-full max-w-[300px] overflow-hidden rounded-xl border border-border bg-card"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={rowVariants}
        className="flex items-center justify-between border-b border-border px-3.5 py-2.5"
      >
        <p className="text-sm font-semibold text-foreground">Processo</p>
        <button className="rounded-md bg-primary px-2 py-1 text-[9px] font-semibold text-primary-foreground">
          + Etapa
        </button>
      </motion.div>

      <div className="flex flex-col gap-1.5 px-2 py-1.5">
        {STEPS.map((step, index) => {
          const isActive = activeIndex === index
          return (
            <motion.div
              key={step.number}
              variants={rowVariants}
              className={`flex items-start gap-2 rounded-lg border border-border px-2.5 py-2 transition-colors duration-300 ${
                isActive ? step.activeBg : ''
              }`}
            >
              <div className="mt-0.5 flex shrink-0 items-center gap-1">
                <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  {step.number}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-foreground">{step.name}</p>
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.p
                      key={`desc-${step.number}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden text-[8.5px] text-muted-foreground"
                    >
                      {step.description}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="mt-1 flex flex-wrap gap-1">
                  {step.actions.map((action) => {
                    const ActionIcon = action.icon
                    return (
                      <span
                        key={action.label}
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-medium ${action.color}`}
                      >
                        <ActionIcon className="h-2.5 w-2.5" />
                        {action.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )
        })}

        <motion.div variants={rowVariants} className="px-2 py-2">
          <button className="w-full rounded-lg border border-dashed border-border/60 py-1.5 text-[9px] font-medium text-muted-foreground transition-colors hover:border-border">
            + Adicionar etapa
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
