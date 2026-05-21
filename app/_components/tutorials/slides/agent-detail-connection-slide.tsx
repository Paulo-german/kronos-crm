'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

const INBOXES = [
  {
    initial: 'W',
    name: 'Inbox Principal',
    channel: 'WhatsApp · Evolution',
    avatarBg: 'bg-kronos-green/10',
    avatarText: 'text-kronos-green',
  },
  {
    initial: 'I',
    name: 'Inbox Instagram',
    channel: 'Instagram · Meta',
    avatarBg: 'bg-kronos-purple/10',
    avatarText: 'text-kronos-purple',
  },
]

export const AgentDetailConnectionSlide = () => {
  return (
    <motion.div
      className="w-full max-w-[300px] overflow-hidden rounded-xl border border-border bg-card"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <p className="text-sm font-semibold text-foreground">Conexão</p>
        <button className="rounded-md bg-primary px-2.5 py-1 text-[9px] font-semibold text-primary-foreground">
          + Vincular inbox
        </button>
      </div>

      <div className="divide-y divide-border/60">
        {INBOXES.map((inbox) => (
          <motion.div
            key={inbox.name}
            className="flex items-center gap-2.5 px-3.5 py-3"
            variants={itemVariants}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${inbox.avatarBg} ${inbox.avatarText}`}
            >
              {inbox.initial}
            </span>

            <div className="flex flex-1 flex-col">
              <span className="text-[10px] font-semibold text-foreground">{inbox.name}</span>
              <span className="text-[8px] text-muted-foreground">{inbox.channel}</span>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-kronos-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-kronos-green">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Conectado
              </span>
              <button className="text-[8px] text-muted-foreground/60 hover:text-destructive">
                Desvincular
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
