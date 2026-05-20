'use client'

import { motion } from 'framer-motion'
import { Phone, Users, MessageCircle, Briefcase, Mail, ChevronRight } from 'lucide-react'

interface ActivityTypeRow {
  icon: React.ComponentType<{ className?: string }>
  label: string
  outcomes: string[]
}

const ACTIVITY_TYPES: ActivityTypeRow[] = [
  { icon: Phone, label: 'Ligação', outcomes: ['Atendeu', 'Não atendeu', 'Caixa postal'] },
  { icon: Users, label: 'Reunião', outcomes: ['Realizada', 'Remarcou', 'Não compareceu'] },
  { icon: MessageCircle, label: 'WhatsApp', outcomes: ['Respondeu', 'Não respondeu'] },
  { icon: Briefcase, label: 'Visita', outcomes: ['Realizada', 'Cancelada', 'Remarcou'] },
  { icon: Mail, label: 'E-mail', outcomes: ['Respondeu', 'Sem resposta'] },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
}

export const TaskOutcomeTypesSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[320px] flex-col gap-1.5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {ACTIVITY_TYPES.map((row) => {
        const Icon = row.icon
        return (
          <motion.div
            key={row.label}
            variants={itemVariants}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="w-16 shrink-0 text-[11px] font-medium text-foreground">
              {row.label}
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/30" />
            <div className="flex flex-wrap gap-1">
              {row.outcomes.map((outcome) => (
                <span
                  key={outcome}
                  className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                >
                  {outcome}
                </span>
              ))}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
