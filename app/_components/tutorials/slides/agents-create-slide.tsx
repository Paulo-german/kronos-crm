'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZapIcon, UsersIcon } from 'lucide-react'

const TONE_OPTIONS = [
  { label: 'Formal', value: 'formal' },
  { label: 'Profissional', value: 'professional' },
  { label: 'Amigável', value: 'friendly' },
  { label: 'Casual', value: 'casual' },
]

const SELECTED_TONE = 'professional'

const SECTION_TRANSITION = { duration: 0.28, ease: 'easeOut' as const }


export const AgentsCreateSlide = () => {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    timers.push(setTimeout(() => setStep(1), 400))
    timers.push(setTimeout(() => setStep(2), 1200))
    timers.push(setTimeout(() => setStep(3), 1800))
    timers.push(setTimeout(() => setStep(4), 2500))
    timers.push(setTimeout(() => setStep(5), 3200))

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="w-full max-w-[260px]">
      <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              key="header"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SECTION_TRANSITION}
              className="border-b border-border px-4 py-3"
            >
              <p className="text-sm font-semibold text-foreground">Novo agente</p>
              <p className="text-[10px] text-muted-foreground">Configure seu agente de IA</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-4 p-4">
          <AnimatePresence>
            {step >= 1 && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SECTION_TRANSITION}
                className="flex flex-col gap-1.5"
              >
                <label className="text-[11px] font-medium text-foreground">
                  Nome do agente
                </label>
                <div className="relative flex h-8 items-center rounded-md border border-border bg-background px-2.5">
                  <AnimatePresence>
                    {step >= 2 ? (
                      <motion.span
                        key="typed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="text-[11px] text-foreground"
                      >
                        Agente SDR Kronos
                      </motion.span>
                    ) : (
                      <motion.span
                        key="placeholder"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] text-muted-foreground/50"
                      >
                        Ex: SDR Vendas
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {step >= 1 && step < 2 && (
                    <motion.span
                      className="ml-0.5 inline-block h-3.5 w-px bg-foreground"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step >= 3 && (
              <motion.div
                key="role-field"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SECTION_TRANSITION}
                className="flex flex-col gap-1.5"
              >
                <label className="text-[11px] font-medium text-foreground">Papel</label>
                <div className="flex h-8 items-center justify-between rounded-md border border-border bg-background px-2.5">
                  <span className="text-[11px] text-foreground">SDR</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step >= 4 && (
              <motion.div
                key="tone-field"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SECTION_TRANSITION}
                className="flex flex-col gap-1.5"
              >
                <label className="text-[11px] font-medium text-foreground">Tom de voz</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TONE_OPTIONS.map((tone) => (
                    <div
                      key={tone.value}
                      className={`flex h-7 items-center justify-center rounded-md px-2 text-[10px] font-medium transition-colors ${
                        tone.value === SELECTED_TONE
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tone.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step >= 5 && (
              <motion.div
                key="arch-field"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SECTION_TRANSITION}
                className="flex flex-col gap-1.5"
              >
                <label className="text-[11px] font-medium text-foreground">Arquitetura</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center gap-1 rounded-lg border-2 border-primary/40 bg-primary/5 px-2 py-2.5">
                    <ZapIcon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-semibold text-foreground">Single</span>
                    <span className="text-[8px] font-medium text-primary">Selecionado</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-2.5 opacity-60">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground">Crew</span>
                    <span className="rounded bg-muted px-1 py-px text-[8px] font-medium text-muted-foreground">
                      Em breve
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
