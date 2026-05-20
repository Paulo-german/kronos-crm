'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Bot, CheckSquare, MessageSquare, UserCheck } from 'lucide-react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const arrowVariants = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { duration: 0.4 } },
}

const chipContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const chipVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export const AgentsHowItWorksSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[260px] flex-col items-center gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2"
        variants={itemVariants}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-kronos-blue/10">
          <MessageSquare className="h-3.5 w-3.5 text-kronos-blue" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-foreground">Mensagem recebida</span>
          <span className="text-[9px] text-muted-foreground">WhatsApp · Agora</span>
        </div>
      </motion.div>

      <motion.div
        className="mx-auto h-5 w-px bg-border"
        variants={arrowVariants}
        style={{ transformOrigin: 'top' }}
      />

      <motion.div
        className="relative flex w-full flex-col items-center gap-1 rounded-xl border-2 border-primary/30 bg-primary/5 px-3 py-3"
        variants={itemVariants}
        animate={{
          scale: [1, 1.02, 1],
          transition: {
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
            ease: 'easeInOut',
          },
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-kronos-purple">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-foreground">Agente analisa</span>
            <span className="text-[9px] text-muted-foreground">IA processando...</span>
          </div>
        </div>
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-primary/20"
          animate={{ opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.div
        className="mx-auto h-5 w-px bg-border"
        variants={arrowVariants}
        style={{ transformOrigin: 'top' }}
      />

      <motion.div
        className="flex flex-wrap justify-center gap-1.5"
        variants={chipContainerVariants}
      >
        <motion.div
          className="inline-flex items-center gap-1 rounded-full bg-kronos-green/10 px-2.5 py-1 text-[10px] font-semibold text-kronos-green"
          variants={chipVariants}
        >
          <UserCheck className="h-3 w-3" />
          Qualificou lead
        </motion.div>

        <motion.div
          className="inline-flex items-center gap-1 rounded-full bg-kronos-blue/10 px-2.5 py-1 text-[10px] font-semibold text-kronos-blue"
          variants={chipVariants}
        >
          <ArrowRight className="h-3 w-3" />
          Moveu etapa
        </motion.div>

        <motion.div
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-500"
          variants={chipVariants}
        >
          <CheckSquare className="h-3 w-3" />
          Criou tarefa
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
