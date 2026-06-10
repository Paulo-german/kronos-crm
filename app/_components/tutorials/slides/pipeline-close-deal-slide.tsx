'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowRightLeft, CircleIcon } from 'lucide-react'

const ACTIONS = [
  {
    id: 'won',
    icon: CheckCircle2,
    label: 'Marcar Venda',
    desc: 'Registrar negócio ganho',
    activeBorder: 'border-2 border-kronos-green',
    activeBg: 'bg-kronos-green/10',
    iconColor: 'text-kronos-green',
    labelColor: 'text-kronos-green',
    descColor: 'text-kronos-green/70',
    statusLabel: 'VENDIDO',
    statusStyle: 'text-kronos-green bg-kronos-green/10 border-kronos-green/20',
  },
  {
    id: 'lost',
    icon: XCircle,
    label: 'Marcar Perda',
    desc: 'Informar motivo da perda',
    activeBorder: 'border-2 border-destructive/60',
    activeBg: 'bg-destructive/5',
    iconColor: 'text-destructive',
    labelColor: 'text-destructive',
    descColor: 'text-destructive/60',
    statusLabel: 'PERDIDO',
    statusStyle: 'text-kronos-red bg-kronos-red/10 border-kronos-red/20',
  },
  {
    id: 'transfer',
    icon: ArrowRightLeft,
    label: 'Transferir',
    desc: 'Mover para outro vendedor',
    activeBorder: 'border-2 border-primary/40',
    activeBg: 'bg-primary/5',
    iconColor: 'text-primary',
    labelColor: 'text-foreground',
    descColor: 'text-muted-foreground',
    statusLabel: 'EM ANDAMENTO',
    statusStyle:
      'text-kronos-purple bg-kronos-purple/10 border-kronos-purple/20',
  },
]

const CONFETTI = [
  { x: -36, y: -18, color: 'bg-kronos-green' },
  { x: 36, y: -24, color: 'bg-kronos-yellow' },
  { x: -22, y: 20, color: 'bg-primary' },
  { x: 28, y: 16, color: 'bg-kronos-blue' },
  { x: 4, y: -32, color: 'bg-kronos-green' },
  { x: -40, y: 6, color: 'bg-amber-400' },
  { x: 40, y: -8, color: 'bg-kronos-green' },
  { x: 14, y: 28, color: 'bg-primary' },
  { x: -14, y: -28, color: 'bg-kronos-yellow' },
  { x: 20, y: -12, color: 'bg-kronos-blue' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
}

export const PipelineCloseDealSlide = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [confettiKey, setConfettiKey] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => setActiveIndex(0), 1000)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (activeIndex === null) return
    if (activeIndex === 0) setConfettiKey((prev) => prev + 1)
    const timeout = setTimeout(
      () => setActiveIndex((prev) => ((prev ?? 0) + 1) % ACTIONS.length),
      1600,
    )
    return () => clearTimeout(timeout)
  }, [activeIndex])

  const activeAction = activeIndex !== null ? ACTIONS[activeIndex] : null

  return (
    <div className="flex w-full max-w-[260px] flex-col gap-3">
      {/* Mini deal card — status muda conforme a ação ativa */}
      <div className="rounded-xl border border-border bg-card px-3 py-2.5">
        <div className="mb-1.5 h-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeAction?.id ?? 'initial'}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.22 }}
            >
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                  activeAction?.statusStyle ??
                  'border-kronos-purple/20 bg-kronos-purple/10 text-kronos-purple'
                }`}
              >
                <CircleIcon className="h-1.5 w-1.5 fill-current" />
                {activeAction?.statusLabel ?? 'EM ANDAMENTO'}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="text-[10px] font-bold text-foreground">
          Proposta Acme Corp
        </p>
        <p className="text-[9px] text-muted-foreground">R$ 45.000</p>
      </div>

      {/* Botões de ação */}
      <motion.div
        className="flex flex-col gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {ACTIONS.map((action, i) => {
          const isActive = activeIndex === i
          return (
            <motion.div
              key={action.id}
              variants={itemVariants}
              animate={{ scale: isActive ? 1.02 : 1 }}
              transition={{ duration: 0.2 }}
              className={`relative flex items-center gap-2.5 rounded-lg px-4 py-3 transition-all duration-300 ${
                isActive
                  ? `${action.activeBorder} ${action.activeBg}`
                  : 'border border-border bg-card'
              }`}
            >
              <action.icon
                className={`h-5 w-5 shrink-0 transition-colors duration-300 ${
                  isActive ? action.iconColor : 'text-muted-foreground'
                }`}
              />
              <div>
                <p
                  className={`text-sm font-semibold transition-colors duration-300 ${
                    isActive ? action.labelColor : 'text-foreground'
                  }`}
                >
                  {action.label}
                </p>
                <p
                  className={`text-[10px] transition-colors duration-300 ${
                    isActive ? action.descColor : 'text-muted-foreground'
                  }`}
                >
                  {action.desc}
                </p>
              </div>

              {/* Confetti no Marcar Venda */}
              {action.id === 'won' && isActive && (
                <div
                  key={confettiKey}
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
                >
                  {CONFETTI.map((dot, di) => (
                    <motion.div
                      key={di}
                      className={`absolute h-1.5 w-1.5 rounded-full ${dot.color}`}
                      style={{ left: '50%', top: '50%' }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: dot.x, y: dot.y, opacity: 0, scale: 0 }}
                      transition={{
                        duration: 0.7,
                        delay: di * 0.04,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
