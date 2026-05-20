'use client'

import { motion } from 'framer-motion'
import { ChevronDown, LayoutGrid, List, SlidersHorizontal } from 'lucide-react'

const FILTERS = ['Situação', 'Prioridade', 'Valor', 'Responsável']
const ACTIVE_FILTERS = ['Alta prioridade', 'Abertos']

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const PipelineFiltersSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[300px] flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Barra de filtros */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-1.5">
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1">
          <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Filtros</span>
        </div>
        {FILTERS.map((filter) => (
          <div
            key={filter}
            className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1"
          >
            <span className="text-[10px] text-muted-foreground">{filter}</span>
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/60" />
          </div>
        ))}
      </motion.div>

      {/* Filtros ativos */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-1.5">
        <span className="text-[9px] text-muted-foreground self-center">Ativos:</span>
        {ACTIVE_FILTERS.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary"
          >
            {tag} ×
          </span>
        ))}
      </motion.div>

      {/* Ordenar + toggle de visão */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Ordenar:</span>
          <div className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5">
            <span className="text-[10px] text-foreground">Mais recentes</span>
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/60" />
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
          <div className="rounded p-1 bg-card shadow-sm">
            <LayoutGrid className="h-3 w-3 text-foreground" />
          </div>
          <div className="rounded p-1">
            <List className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
