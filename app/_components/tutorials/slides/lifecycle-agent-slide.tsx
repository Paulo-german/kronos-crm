'use client'

import { motion } from 'framer-motion'
import { Bot, MessageCircle } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'

interface AgentAction {
  trigger: string
  resultStage: LifecycleStage
  detail: string
}

const AGENT_ACTIONS: AgentAction[] = [
  {
    trigger: '"Gostei! Quanto custa o plano?"',
    resultStage: LifecycleStage.QUALIFIED,
    detail: 'detectou interesse real',
  },
  {
    trigger: '"Quero fechar, pode gerar a proposta?"',
    resultStage: LifecycleStage.OPPORTUNITY,
    detail: 'criou o negócio automaticamente',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export const LifecycleAgentSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[320px] flex-col gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {AGENT_ACTIONS.map((action) => {
        const stageConfig = LIFECYCLE_STAGE_CONFIG[action.resultStage]
        const StageIcon = stageConfig.icon

        return (
          <motion.div
            key={action.resultStage}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
            variants={cardVariants}
          >
            {/* Mensagem do contato */}
            <div className="flex items-start gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] italic leading-snug text-muted-foreground">
                {action.trigger}
              </p>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border/50" />
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                <Bot className="h-2.5 w-2.5 text-primary" />
                <span className="text-[9px] font-semibold text-primary">Agente IA</span>
              </div>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            {/* Resultado: estágio avançado */}
            <motion.div
              className="flex items-center justify-center gap-1.5"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 250 }}
            >
              <StageIcon className={`h-3.5 w-3.5 ${stageConfig.colorClassName}`} />
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageConfig.badgeClassName}`}
              >
                {stageConfig.label}
              </span>
              <span className="text-[9px] text-muted-foreground">{action.detail}</span>
            </motion.div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
