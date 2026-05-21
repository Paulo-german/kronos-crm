'use client'

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

const FOLLOWUPS = [
  {
    delay: '2h',
    label: 'Sem resposta',
    action: 'Enviar mensagem',
    actionColor: 'bg-kronos-blue/10 text-kronos-blue',
  },
  {
    delay: '24h',
    label: 'Sem resposta',
    action: 'Enviar mensagem',
    actionColor: 'bg-kronos-blue/10 text-kronos-blue',
  },
  {
    delay: '3 dias',
    label: 'Sem resposta',
    action: 'Notificar humano',
    actionColor: 'bg-amber-500/10 text-amber-500',
  },
]

export const AgentDetailFollowupsSlide = () => {
  return (
    <motion.div
      className="w-full max-w-[300px] overflow-hidden rounded-xl border border-border bg-card"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <p className="text-sm font-semibold text-foreground">Follow-ups</p>
        <button className="rounded-md bg-primary px-2.5 py-1 text-[9px] font-semibold text-primary-foreground">
          + Novo
        </button>
      </div>

      <div className="divide-y divide-border/60">
        {FOLLOWUPS.map((followup) => (
          <motion.div
            key={followup.delay}
            className="flex items-center gap-2.5 px-3.5 py-2.5"
            variants={itemVariants}
          >
            <div className="flex shrink-0 items-center justify-center rounded-lg bg-muted/50 p-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex flex-1 flex-col">
              <span className="text-[10px] font-semibold text-foreground">
                Aguardar {followup.delay}
              </span>
              <span className="text-[8px] text-muted-foreground">{followup.label}</span>
            </div>

            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-semibold ${followup.actionColor}`}
            >
              {followup.action}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="border-t border-border bg-muted/20 px-3.5 py-2.5"
        variants={itemVariants}
      >
        <p className="mb-1 text-[8px] text-muted-foreground">Após todos os follow-ups</p>
        <div className="rounded-md border border-border bg-card px-2 py-1 text-[9px] font-medium text-foreground">
          Notificar equipe ▾
        </div>
      </motion.div>
    </motion.div>
  )
}
