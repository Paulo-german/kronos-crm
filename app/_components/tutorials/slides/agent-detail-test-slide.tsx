'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type Phase = 'button' | 'panel'

export const AgentDetailTestSlide = () => {
  const [phase, setPhase] = useState<Phase>('button')
  const [step, setStep] = useState(0)

  useEffect(() => {
    const phaseTimer = setTimeout(() => setPhase('panel'), 1200)
    return () => clearTimeout(phaseTimer)
  }, [])

  useEffect(() => {
    if (phase !== 'panel') return

    if (step < 4) {
      const delays = [400, 900, 300, 900]
      const timer = setTimeout(() => setStep((prev) => prev + 1), delays[step])
      return () => clearTimeout(timer)
    }

    const resetTimer = setTimeout(() => {
      setPhase('button')
      setStep(0)
    }, 2500)
    return () => clearTimeout(resetTimer)
  }, [phase, step])

  return (
    <div className="relative flex w-full max-w-[280px] flex-col">
      <AnimatePresence mode="wait">
        {phase === 'button' && (
          <motion.div
            key="button-phase"
            className="flex h-[220px] w-full flex-col items-end justify-center gap-3 rounded-xl border border-border bg-card px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-col items-end gap-2">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <Bot className="h-4 w-4 text-primary-foreground" />
              </motion.div>

              <motion.span
                className="rounded-md border border-border bg-card px-2 py-1 text-[9px] font-medium text-foreground shadow-sm"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.4 }}
              >
                Testar agente
              </motion.span>
            </div>
          </motion.div>
        )}

        {phase === 'panel' && (
          <motion.div
            key="panel-phase"
            className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[10px] font-semibold text-foreground">Agente SDR</span>
              </div>
              <X className="h-3 w-3 text-muted-foreground" />
            </div>

            <div className="flex min-h-[140px] flex-col gap-2 px-3 py-3">
              <AnimatePresence>
                {step >= 1 && (
                  <motion.div
                    key="agent-msg-1"
                    className="flex justify-start"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="max-w-[80%] rounded-xl rounded-tl-none bg-muted px-2.5 py-1.5">
                      <p className="text-[9px] leading-snug text-foreground">
                        Olá! Como posso te ajudar?
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {step >= 2 && (
                  <motion.div
                    key="user-msg"
                    className="flex justify-end"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-none bg-primary px-2.5 py-1.5">
                      <p className="text-[9px] leading-snug text-primary-foreground">
                        Quero saber sobre os planos
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {step === 3 && (
                  <motion.div
                    key="thinking"
                    className="flex justify-start"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-1 rounded-xl rounded-tl-none bg-muted px-2.5 py-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {step >= 4 && (
                  <motion.div
                    key="agent-msg-2"
                    className="flex justify-start"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="max-w-[80%] rounded-xl rounded-tl-none bg-muted px-2.5 py-1.5">
                      <p className="text-[9px] leading-snug text-foreground">
                        Claro! Temos 4 planos disponíveis...
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 border-t border-border px-3 py-2">
              <div className="flex-1 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[9px] text-muted-foreground">
                Mensagem de teste...
              </div>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary">
                <Send className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
