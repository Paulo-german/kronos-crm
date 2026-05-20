'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const TABS = ['Resumo', 'Produtos', 'Tarefas', 'Agendamentos']

const FIELDS = [
  { label: 'Empresa', value: 'Acme Corp' },
  { label: 'Valor', value: 'R$ 12.000' },
  { label: 'Responsável', value: 'Paulo G.' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const PipelineDealDetailSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[280px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="border-b border-border px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">Proposta Acme Corp</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Etapa:</span>
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5">
            <span className="text-[10px] font-medium text-foreground">Proposta</span>
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/60" />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={itemVariants}
        className="flex border-b border-border"
      >
        {TABS.map((tab) => (
          <div
            key={tab}
            className={`flex-1 py-2 text-center text-[9px] font-medium transition-colors ${
              tab === 'Resumo'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {tab}
          </div>
        ))}
      </motion.div>

      {/* Fields */}
      <div className="flex flex-col gap-0 divide-y divide-border/50 px-3 py-1">
        {FIELDS.map((field) => (
          <motion.div
            key={field.label}
            variants={itemVariants}
            className="flex items-center justify-between py-2"
          >
            <span className="text-[10px] text-muted-foreground">{field.label}</span>
            <span className="text-[10px] font-medium text-foreground">{field.value}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
