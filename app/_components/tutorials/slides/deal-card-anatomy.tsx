'use client'

import { motion } from 'framer-motion'
import { CalendarClock, Clock, Flag, MessageCircle, SquareCheckBigIcon, SquareIcon } from 'lucide-react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const DealCardAnatomy = () => {
  return (
    <motion.div
      className="w-full max-w-[300px] rounded-xl border border-border bg-card shadow-none"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex flex-col gap-4 p-3.5">
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <span className="inline-flex h-6 items-center gap-1.5 px-2 text-[10px] font-semibold text-kronos-purple">
            <SquareIcon className="h-2.5 w-2.5 fill-current" />
            EM ANDAMENTO
          </span>
          <motion.button
            type="button"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-kronos-yellow/40 bg-transparent text-kronos-yellow"
          >
            <Flag className="h-3.5 w-3.5" />
          </motion.button>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="line-clamp-2 text-base font-semibold leading-tight text-foreground"
        >
          Automação de Vendas
        </motion.p>

        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-kronos-purple">
              FA
            </div>
            <span className="text-xs font-bold text-foreground">R$ 45.000</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <SquareCheckBigIcon className="h-3 w-3" />2
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />1
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />3
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-500"
        >
          <Clock className="h-3 w-3" />
          <span>12 dias sem atividade</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
