'use client'

import { motion } from 'framer-motion'
import { Clock, Flag, MessageCircle, SquareCheckBigIcon, SquareIcon } from 'lucide-react'

interface MiniCard {
  title: string
  status: { label: string; color: string }
  initials: string
  value: string
  flag: string
  idle?: { label: string; style: string }
  highlight?: boolean
}

interface Column {
  label: string
  count: number
  value: string
  cards: MiniCard[]
}

const COLUMNS: Column[] = [
  {
    label: 'Novo Lead',
    count: 2,
    value: 'R$ 15k',
    cards: [
      {
        title: 'Acme Corp',
        status: { label: 'NOVO', color: 'text-kronos-blue' },
        initials: 'AC',
        value: 'R$ 8k',
        flag: 'text-kronos-blue border-kronos-blue/40',
        idle: { label: 'Ativo hoje', style: 'text-muted-foreground bg-muted' },
      },
      {
        title: 'Tech S.A.',
        status: { label: 'NOVO', color: 'text-kronos-blue' },
        initials: 'TS',
        value: 'R$ 7k',
        flag: 'text-muted-foreground border-muted-foreground/30',
        idle: { label: '3 dias', style: 'text-muted-foreground bg-muted' },
      },
    ],
  },
  {
    label: 'Qualificado',
    count: 2,
    value: 'R$ 57k',
    cards: [
      {
        title: 'Automação de Vendas',
        status: { label: 'EM ANDAMENTO', color: 'text-kronos-purple' },
        initials: 'PG',
        value: 'R$ 45k',
        flag: 'text-kronos-yellow border-kronos-yellow/40',
        idle: { label: '12 dias', style: 'text-kronos-yellow bg-kronos-yellow/10' },
        highlight: true,
      },
      {
        title: 'Global Ltda',
        status: { label: 'EM ANDAMENTO', color: 'text-kronos-purple' },
        initials: 'GL',
        value: 'R$ 12k',
        flag: 'text-muted-foreground border-muted-foreground/30',
        idle: { label: 'Ativo hoje', style: 'text-muted-foreground bg-muted' },
      },
    ],
  },
]

const colVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.12 },
  }),
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.08 },
  }),
}

export const PipelineOverviewSlide = () => {
  return (
    <div className="flex w-full gap-2.5">
      {COLUMNS.map((col, colIndex) => (
        <motion.div
          key={col.label}
          custom={colIndex}
          variants={colVariants}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-kanban-column"
        >
          {/* Header da coluna */}
          <div className="space-y-0.5 border-b border-border p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">{col.label}</span>
              <span className="text-[9px] text-muted-foreground">{col.count}</span>
            </div>
            <p className="text-[9px] text-muted-foreground">{col.value}</p>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-1.5 p-1.5">
            {col.cards.map((card, cardIndex) => (
              <motion.div
                key={card.title}
                custom={colIndex * 2 + cardIndex}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                className={`rounded-lg border border-border p-2 ${
                  card.highlight ? 'bg-kanban-card ring-1 ring-primary/20' : 'bg-kanban-card'
                }`}
              >
                {/* Status + Flag */}
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={`flex items-center gap-0.5 text-[8px] font-semibold ${card.status.color}`}>
                    <SquareIcon className="h-1.5 w-1.5 fill-current" />
                    {card.status.label}
                  </span>
                  <div className={`flex h-4 w-4 items-center justify-center rounded border ${card.flag}`}>
                    <Flag className="h-2.5 w-2.5" />
                  </div>
                </div>

                {/* Título */}
                <p className="mb-1.5 text-[10px] font-semibold leading-tight text-foreground">
                  {card.title}
                </p>

                {/* Avatar + Valor + Contadores */}
                <div className="mb-1.5 flex items-center justify-between">
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

                {/* Inatividade */}
                {card.idle && (
                  <div className={`flex items-center justify-center gap-1 rounded px-1 py-0.5 text-[8px] font-medium ${card.idle.style}`}>
                    <Clock className="h-2 w-2" />
                    {card.idle.label}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
