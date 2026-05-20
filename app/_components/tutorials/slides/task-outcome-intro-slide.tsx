'use client'

import { motion } from 'framer-motion'
import { PhoneCall, PhoneOff, Voicemail, UserX } from 'lucide-react'

interface OutcomeOption {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  positive: boolean
}

const OPTIONS: OutcomeOption[] = [
  { value: 'answered', label: 'Atendeu', icon: PhoneCall, positive: true },
  { value: 'no_answer', label: 'Não atendeu', icon: PhoneOff, positive: false },
  { value: 'voicemail', label: 'Caixa postal', icon: Voicemail, positive: false },
  { value: 'wrong_number', label: 'Número errado', icon: UserX, positive: false },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
}

export const TaskOutcomeIntroSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[280px] flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.p
        className="text-center text-[11px] font-medium text-muted-foreground"
        variants={itemVariants}
      >
        Como foi a ligação?
      </motion.p>

      <motion.div className="grid grid-cols-2 gap-2" variants={containerVariants}>
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = option.value === 'answered'

          return (
            <motion.div
              key={option.value}
              variants={itemVariants}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                isSelected
                  ? option.positive
                    ? 'border-kronos-green bg-kronos-green/10 text-kronos-green'
                    : 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="leading-tight text-[11px]">{option.label}</span>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground"
      >
        Observações, próximos passos...
      </motion.div>
    </motion.div>
  )
}
