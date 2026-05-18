'use client'

import { motion } from 'framer-motion'

interface MockContact {
  name: string
  dotColor: string
  pingColor: string | null
  statusLabel: string
  timeLabel: string
}

const MOCK_CONTACTS: MockContact[] = [
  {
    name: 'Ana Lima',
    dotColor: 'bg-emerald-500',
    pingColor: null,
    statusLabel: 'Em dia',
    timeLabel: 'há 5 dias',
  },
  {
    name: 'Carlos Silva',
    dotColor: 'bg-amber-500',
    pingColor: 'bg-amber-500',
    statusLabel: 'Precisa de atenção',
    timeLabel: 'há 45 dias',
  },
  {
    name: 'Marta Santos',
    dotColor: 'bg-red-500',
    pingColor: 'bg-red-500',
    statusLabel: 'Em risco de perda',
    timeLabel: 'há 120 dias',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
}

export const LifecycleHealthSlide = () => {
  return (
    <div className="w-full max-w-[280px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border/60 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Contatos
        </p>
      </div>

      <motion.div
        className="flex flex-col divide-y divide-border/40"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {MOCK_CONTACTS.map((contact, index) => (
          <motion.div
            key={contact.name}
            className="flex items-center gap-3 px-3 py-2.5"
            variants={rowVariants}
          >
            <div className="relative shrink-0">
              {contact.pingColor && (
                <span
                  className={`absolute inset-0 rounded-full ${contact.pingColor} animate-ping opacity-40`}
                />
              )}
              <motion.div
                className={`relative h-2 w-2 rounded-full ${contact.dotColor} ring-[2px] ring-offset-1 ring-offset-card ${contact.dotColor.replace('bg-', 'ring-')}/30`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  delay: index * 0.12 + 0.2,
                }}
              />
            </div>
            <span className="flex-1 truncate text-sm font-medium text-foreground">
              {contact.name}
            </span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {contact.statusLabel}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {contact.timeLabel}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
