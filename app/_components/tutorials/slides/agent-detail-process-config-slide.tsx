'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight as ArrowRightIcon,
  CheckSquare as CheckSquareIcon,
} from 'lucide-react'

const MINI_STEPS = [
  { number: 1, name: 'Qualificação', active: true },
  { number: 2, name: 'Apresentação', active: false },
  { number: 3, name: 'Encerramento', active: false },
]

const ACTIONS = [
  {
    icon: ArrowRightIcon,
    label: 'Mover etapa',
    value: 'Qualificado',
    color: 'text-indigo-500 bg-indigo-500/10',
    isOn: true,
  },
  {
    icon: CheckSquareIcon,
    label: 'Criar tarefa',
    value: 'Ligação',
    color: 'text-kronos-green bg-kronos-green/10',
    isOn: false,
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export const AgentDetailProcessConfigSlide = () => {
  const [visibleStep, setVisibleStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleStep(1), 500),
      setTimeout(() => setVisibleStep(2), 900),
      setTimeout(() => setVisibleStep(3), 1300),
      setTimeout(() => setVisibleStep(4), 1900),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex w-full max-w-[300px] flex-col gap-2">
      <AnimatePresence>
        {visibleStep >= 0 && (
          <motion.div
            key="mini-steps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {MINI_STEPS.map((step) => (
              <div
                key={step.number}
                className={`flex items-center gap-2 border-l-2 px-2.5 py-1.5 transition-all duration-300 ${
                  step.active
                    ? 'border-l-primary bg-primary/5'
                    : 'border-l-transparent opacity-40'
                }`}
              >
                <span className="text-[9px] font-bold text-muted-foreground">
                  {step.number}
                </span>
                <span className="text-[9px] font-medium text-foreground">{step.name}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <AnimatePresence>
          {visibleStep >= 1 && (
            <motion.div
              key="panel-header"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="border-b border-border bg-muted/20 px-3 py-2 text-[9px] font-semibold text-foreground"
            >
              Configurando: Qualificação
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3 p-3">
          <AnimatePresence>
            {visibleStep >= 2 && (
              <motion.div
                key="name-field"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1"
              >
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome do step
                </span>
                <div className="rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-[9px] font-medium text-foreground">
                  Qualificação
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {visibleStep >= 3 && (
              <motion.div
                key="instructions-field"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1"
              >
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Instruções para o agente
                </span>
                <div className="w-full min-h-[52px] rounded-md border border-border bg-muted/20 px-2.5 py-2 text-[8.5px] leading-relaxed text-foreground/80">
                  Faça perguntas para entender o perfil do lead. Identifique o segmento, número de funcionários e principal desafio comercial...
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                    className="inline-block w-px h-3 bg-foreground ml-px align-middle"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {visibleStep >= 4 && (
              <motion.div
                key="actions-section"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1"
              >
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ações automáticas
                </span>
                <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
                  {ACTIONS.map((action) => {
                    const ActionIcon = action.icon
                    return (
                      <div key={action.label} className="flex items-center gap-2 px-2.5 py-2">
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${action.color}`}>
                          <ActionIcon className="h-2.5 w-2.5" />
                        </div>
                        <span className="flex-1 text-[9px] font-medium text-foreground">
                          {action.label}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[8px] text-muted-foreground">
                          {action.value}
                        </span>
                        <div
                          className={`relative h-4 w-7 rounded-full ${
                            action.isOn ? 'bg-kronos-green' : 'bg-muted-foreground/30'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all duration-300 ${
                              action.isOn ? 'left-[14px]' : 'left-0.5'
                            }`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
