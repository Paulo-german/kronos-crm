'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
}

export const PipelineCloseDealSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[240px] flex-col gap-2.5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.button
        variants={itemVariants}
        className="flex items-center gap-2.5 rounded-lg border-2 border-kronos-green bg-kronos-green/10 px-4 py-3 text-left"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-kronos-green" />
        <div>
          <p className="text-sm font-semibold text-kronos-green">Marcar Venda</p>
          <p className="text-[10px] text-kronos-green/70">Registrar negócio ganho</p>
        </div>
      </motion.button>

      <motion.button
        variants={itemVariants}
        className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted/40"
      >
        <XCircle className="h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-foreground">Marcar Perda</p>
          <p className="text-[10px] text-muted-foreground">Informar motivo da perda</p>
        </div>
      </motion.button>

      <motion.button
        variants={itemVariants}
        className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted/40"
      >
        <ArrowRightLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Transferir</p>
          <p className="text-[10px] text-muted-foreground">Mover para outro vendedor</p>
        </div>
      </motion.button>
    </motion.div>
  )
}
