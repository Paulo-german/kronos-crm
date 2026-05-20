'use client'

import { motion } from 'framer-motion'
import { Plus, User, ChevronDown } from 'lucide-react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const PipelineCreateDealSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[260px] flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Botão de novo negócio */}
      <motion.div variants={itemVariants} className="flex justify-end">
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Negócio
        </motion.div>
      </motion.div>

      {/* Form mock */}
      <motion.div
        variants={itemVariants}
        className="rounded-lg border border-border bg-card p-3 shadow-sm"
      >
        <div className="mb-3 flex flex-col gap-2">
          <div>
            <p className="mb-1 text-[9px] font-medium text-muted-foreground">Título</p>
            <div className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
              Ex: Proposta Acme Corp
            </div>
          </div>
          <div>
            <p className="mb-1 text-[9px] font-medium text-muted-foreground">Etapa</p>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground">Novo Lead</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[9px] font-medium text-muted-foreground">Contato</p>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
              <User className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground">Buscar contato...</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="rounded-md bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
            Criar negócio
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
