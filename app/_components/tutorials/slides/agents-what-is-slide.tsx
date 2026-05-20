'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { useEffect, useState } from 'react'

export const AgentsWhatIsSlide = () => {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step < 4) {
      const delays = [400, 800, 1000, 800]
      const timer = setTimeout(() => setStep((prev) => prev + 1), delays[step])
      return () => clearTimeout(timer)
    }

    const resetTimer = setTimeout(() => setStep(0), 2000)
    return () => clearTimeout(resetTimer)
  }, [step])

  return (
    <div className="flex w-full max-w-[280px] flex-col gap-3">
      <motion.div
        className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.0 }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-foreground">Agente SDR</span>
          <span className="text-[9px] text-muted-foreground">Online agora</span>
        </div>
        <div className="ml-auto h-2 w-2 rounded-full bg-kronos-green" />
      </motion.div>

      <div className="flex flex-col gap-2 px-1">
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              key="incoming"
              className="flex justify-start"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                <p className="text-[11px] leading-snug text-foreground">
                  Olá! Quero saber mais sobre o CRM
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step === 2 && (
            <motion.div
              key="thinking"
              className="flex justify-end"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-1 rounded-2xl rounded-tr-sm bg-muted px-3 py-2.5">
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
          {step >= 3 && (
            <motion.div
              key="outgoing-1"
              className="flex justify-end"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2">
                <p className="text-[11px] leading-snug text-primary-foreground">
                  Oi! Sou o assistente da Kronos. Posso te mostrar como funciona?
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              key="outgoing-2"
              className="flex justify-end"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2">
                <p className="text-[11px] leading-snug text-primary-foreground">
                  Você já usa algum CRM hoje?
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
