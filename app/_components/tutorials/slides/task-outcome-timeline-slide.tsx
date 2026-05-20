'use client'

import { motion } from 'framer-motion'
import { PhoneCall, MessageCircle, CalendarCheck } from 'lucide-react'

interface MockActivityEvent {
  icon: React.ComponentType<{ className?: string }>
  iconColorClassName: string
  title: string
  notes?: string
  time: string
}

const MOCK_EVENTS: MockActivityEvent[] = [
  {
    icon: PhoneCall,
    iconColorClassName: 'text-kronos-green',
    title: 'Ligação · Atendeu',
    notes: 'Cliente pediu proposta',
    time: 'há 2h',
  },
  {
    icon: MessageCircle,
    iconColorClassName: 'text-blue-400',
    title: 'WhatsApp · Respondeu',
    time: 'ontem',
  },
  {
    icon: CalendarCheck,
    iconColorClassName: 'text-violet-400',
    title: 'Reunião realizada',
    notes: 'Enviou contrato',
    time: 'há 3 dias',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
}

export const TaskOutcomeTimelineSlide = () => {
  return (
    <div className="w-full max-w-[300px]">
      <div className="relative">
        <motion.div
          className="absolute left-0 top-0 w-px bg-border/40"
          style={{ transformOrigin: 'top', height: '100%' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        <motion.div
          className="space-y-4 pl-5"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {MOCK_EVENTS.map((event, index) => {
            const Icon = event.icon
            return (
              <motion.div key={index} className="relative" variants={rowVariants}>
                <motion.div
                  className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border border-border bg-background ring-2 ring-background"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    delay: index * 0.2 + 0.3,
                  }}
                />

                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${event.iconColorClassName}`} />
                  <span className="text-[11px] font-medium text-foreground">{event.title}</span>
                </div>

                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {[event.notes, event.time].filter(Boolean).join(' · ')}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
