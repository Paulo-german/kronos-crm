'use client'

import { motion } from 'framer-motion'
import { ChevronDown, Funnel, Plus } from 'lucide-react'

const PIPELINES = [
  { name: 'Vendas Inbound', count: 24, isActive: true },
  { name: 'Vendas Outbound', count: 11, isActive: false },
  { name: 'Retenção de Clientes', count: 7, isActive: false },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const PipelineMultiFunnelSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[260px] flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Selector trigger */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
      >
        <Funnel className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium text-foreground">Vendas Inbound</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </motion.div>

      {/* Dropdown aberto */}
      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-lg border border-border bg-card shadow-md"
      >
        {PIPELINES.map((pipeline, index) => (
          <motion.div
            key={pipeline.name}
            variants={itemVariants}
            className={`flex items-center justify-between px-3 py-2.5 ${
              index < PIPELINES.length - 1 ? 'border-b border-border/50' : ''
            } ${pipeline.isActive ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
          >
            <div className="flex items-center gap-2">
              {pipeline.isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              {!pipeline.isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
              )}
              <span
                className={`text-[12px] font-medium ${
                  pipeline.isActive ? 'text-primary' : 'text-foreground'
                }`}
              >
                {pipeline.name}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">{pipeline.count}</span>
          </motion.div>
        ))}

        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Gerenciar funis</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
