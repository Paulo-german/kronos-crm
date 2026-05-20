'use client'

import { motion } from 'framer-motion'
import { CalendarIcon, LayoutGrid, List, SquareIcon } from 'lucide-react'

interface DealRow {
  title: string
  stage: string
  status: { label: string; color: string }
  priority: { dot: string }
  value: string
  assignee: string
  date: string
}

const DEALS: DealRow[] = [
  {
    title: 'Automação de Vendas',
    stage: 'Proposta',
    status: { label: 'EM ANDAMENTO', color: 'text-kronos-purple' },
    priority: { dot: 'bg-kronos-yellow' },
    value: 'R$ 45.000',
    assignee: 'PG',
    date: '30/06/26',
  },
  {
    title: 'Acme Corp — Expansão',
    stage: 'Qualificado',
    status: { label: 'NOVO', color: 'text-kronos-blue' },
    priority: { dot: 'bg-kronos-blue' },
    value: 'R$ 12.000',
    assignee: 'FA',
    date: '15/07/26',
  },
  {
    title: 'Inova Ltd — Onboarding',
    stage: 'Fechamento',
    status: { label: 'EM ANDAMENTO', color: 'text-kronos-purple' },
    priority: { dot: 'bg-kronos-red' },
    value: 'R$ 8.500',
    assignee: 'MR',
    date: '01/07/26',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
}

export const PipelineListViewSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[380px] flex-col gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Toggle de visão */}
      <motion.div variants={rowVariants} className="flex items-center justify-end gap-1">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
          <div className="rounded p-1">
            <LayoutGrid className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="rounded bg-card p-1 shadow-sm">
            <List className="h-3 w-3 text-foreground" />
          </div>
        </div>
      </motion.div>

      {/* Linhas da lista */}
      {DEALS.map((deal) => (
        <motion.div
          key={deal.title}
          variants={rowVariants}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          {/* Dot de prioridade */}
          <div className={`h-2 w-2 shrink-0 rounded-full ${deal.priority.dot}`} />

          {/* Título + etapa */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-foreground">{deal.title}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`text-[9px] font-semibold ${deal.status.color}`}>
                <SquareIcon className="mr-0.5 inline h-2 w-2 fill-current" />
                {deal.status.label}
              </span>
              <span className="text-[9px] text-muted-foreground">{deal.stage}</span>
            </div>
          </div>

          {/* Valor */}
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-foreground">
            {deal.value}
          </span>

          {/* Data */}
          <div className="hidden shrink-0 items-center gap-0.5 text-[9px] text-muted-foreground sm:flex">
            <CalendarIcon className="h-2.5 w-2.5" />
            {deal.date}
          </div>

          {/* Avatar responsável */}
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-kronos-purple">
            {deal.assignee}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
