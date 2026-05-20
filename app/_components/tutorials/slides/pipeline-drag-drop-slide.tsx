'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Flag, SquareIcon, SquareCheckBigIcon, MessageCircle } from 'lucide-react'

type Phase = 'left' | 'flying' | 'right'

interface CardData {
  id: string
  title: string
  status: { label: string; color: string }
  value: string
  initials: string
  flag: string
}

const STATIC_LEFT: CardData = {
  id: 'tech',
  title: 'Tech S.A.',
  status: { label: 'NOVO', color: 'text-kronos-blue' },
  value: 'R$ 7k',
  initials: 'TS',
  flag: 'text-muted-foreground border-muted-foreground/30',
}

const STATIC_RIGHT: CardData = {
  id: 'global',
  title: 'Global Ltda',
  status: { label: 'EM ANDAMENTO', color: 'text-kronos-purple' },
  value: 'R$ 12k',
  initials: 'GL',
  flag: 'text-muted-foreground border-muted-foreground/30',
}

const MOVING_CARD: CardData = {
  id: 'acme',
  title: 'Acme Corp',
  status: { label: 'NOVO', color: 'text-kronos-blue' },
  value: 'R$ 8k',
  initials: 'AC',
  flag: 'text-kronos-blue border-kronos-blue/40',
}

function MiniCard({ card, highlight }: { card: CardData; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-2 ${
        highlight
          ? 'border-primary/40 bg-kanban-card ring-1 ring-primary/20'
          : 'border-border bg-kanban-card'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`flex items-center gap-0.5 text-[8px] font-semibold ${card.status.color}`}>
          <SquareIcon className="h-1.5 w-1.5 fill-current" />
          {card.status.label}
        </span>
        <div className={`flex h-4 w-4 items-center justify-center rounded border ${card.flag}`}>
          <Flag className="h-2.5 w-2.5" />
        </div>
      </div>
      <p className="mb-1.5 text-[10px] font-semibold leading-tight text-foreground">{card.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[7px] font-bold text-kronos-purple">
            {card.initials}
          </div>
          <span className="text-[9px] font-bold text-foreground">{card.value}</span>
        </div>
        <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
          <SquareCheckBigIcon className="h-2 w-2" />
          <span>2</span>
          <span className="mx-0.5">·</span>
          <MessageCircle className="h-2 w-2" />
          <span>1</span>
        </div>
      </div>
    </div>
  )
}

export const PipelineDragDropSlide = () => {
  const [phase, setPhase] = useState<Phase>('left')

  useEffect(() => {
    const cycle = () => {
      setPhase('flying')
      setTimeout(() => {
        setPhase('right')
        setTimeout(() => setPhase('left'), 2000)
      }, 1100)
    }

    const timer = setTimeout(cycle, 900)
    const interval = setInterval(cycle, 5200)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="relative flex w-full gap-2.5">
      {/* Coluna origem */}
      <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-kanban-column">
        <div className="border-b border-border p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground">Novo Lead</span>
            <span className="text-[9px] text-muted-foreground">{phase === 'left' ? 2 : 1}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 p-1.5">
          <AnimatePresence initial={false}>
            {phase === 'left' && (
              <motion.div
                key="moving-in-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <MiniCard card={MOVING_CARD} />
              </motion.div>
            )}
          </AnimatePresence>
          <MiniCard card={STATIC_LEFT} />
        </div>
      </div>

      {/* Card voando por cima */}
      <AnimatePresence>
        {phase === 'flying' && (
          <motion.div
            key="flying-card"
            className="absolute z-50"
            style={{
              top: 50,
              left: 0,
              width: 'calc(50% - 5px)',
            }}
            initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
            animate={{ x: 'calc(100% + 10px)', y: -24, rotate: -3, scale: 1.04 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="rounded-lg shadow-2xl ring-1 ring-primary/25">
              <MiniCard card={MOVING_CARD} highlight />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coluna destino */}
      <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-kanban-column">
        <div className="border-b border-border p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground">Qualificado</span>
            <span className="text-[9px] text-muted-foreground">{phase === 'right' ? 2 : 1}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 p-1.5">
          <MiniCard card={STATIC_RIGHT} />
          <AnimatePresence>
            {phase === 'right' && (
              <motion.div
                key="moving-in-right"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <MiniCard card={MOVING_CARD} highlight />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
