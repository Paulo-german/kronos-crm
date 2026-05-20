'use client'

import { motion } from 'framer-motion'
import { CheckSquare, ChevronDown, CalendarCheck, Check } from 'lucide-react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.25 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export const TaskOutcomeFlowSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[280px] flex-col items-center gap-1"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Passo 1: tarefa marcada */}
      <motion.div
        variants={itemVariants}
        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
      >
        <CheckSquare className="h-4 w-4 shrink-0 text-kronos-green" />
        <span className="text-[11px] font-medium text-muted-foreground line-through">
          Reunião com o cliente
        </span>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
      </motion.div>

      {/* Passo 2: dialog de outcome */}
      <motion.div
        variants={itemVariants}
        className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
      >
        <p className="text-[10px] font-semibold text-foreground">Como foi a reunião?</p>
        <div className="flex items-center gap-2 rounded-md border border-kronos-green bg-kronos-green/10 px-2 py-1.5">
          <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-kronos-green" />
          <span className="text-[10px] font-medium text-kronos-green">Reunião realizada</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
      </motion.div>

      {/* Passo 3: resultado salvo */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 rounded-full border border-kronos-green/30 bg-kronos-green/10 px-3 py-1.5"
      >
        <Check className="h-3.5 w-3.5 text-kronos-green" />
        <span className="text-[11px] font-semibold text-kronos-green">
          Resultado salvo na timeline
        </span>
      </motion.div>
    </motion.div>
  )
}
