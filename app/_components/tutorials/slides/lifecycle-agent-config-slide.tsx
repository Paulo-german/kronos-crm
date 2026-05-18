'use client'

import { motion } from 'framer-motion'
import { Bot, ChevronDown, Settings2 } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'

const EXAMPLE_STEPS = [
  {
    name: 'Qualificação',
    description: 'Coleta nome, empresa e dor principal',
    stage: LifecycleStage.QUALIFIED,
  },
  {
    name: 'Apresentação da solução',
    description: 'Apresenta proposta e identifica oportunidade',
    stage: LifecycleStage.OPPORTUNITY,
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export const LifecycleAgentConfigSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[320px] flex-col gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header contextual */}
      <motion.div
        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
        variants={cardVariants}
      >
        <Bot className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-[11px] font-medium text-primary">
          Agente IA → Processo → Etapa
        </span>
        <Settings2 className="ml-auto h-3 w-3 text-primary/60" />
      </motion.div>

      {/* Cards de etapa mockados */}
      {EXAMPLE_STEPS.map((step, index) => {
        const stageConfig = LIFECYCLE_STAGE_CONFIG[step.stage]
        const StageIcon = stageConfig.icon

        return (
          <motion.div
            key={step.name}
            className="overflow-hidden rounded-lg border border-border bg-card"
            variants={cardVariants}
          >
            {/* Header da etapa */}
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
              <span className="text-[11px] font-semibold text-foreground">
                {step.name}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {step.description}
              </span>
            </div>

            {/* Seção de lifecycle */}
            <div className="px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Avançar ciclo ao atingir esta etapa
              </p>

              {/* Select mockado com o estágio selecionado */}
              <motion.div
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${stageConfig.badgeClassName}`}
                initial={{ opacity: 0, scaleX: 0.9 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.3 + index * 0.2, duration: 0.25, ease: 'easeOut' }}
              >
                <StageIcon className={`h-3 w-3 shrink-0 ${stageConfig.colorClassName}`} />
                <span className={`flex-1 text-[11px] font-semibold ${stageConfig.colorClassName}`}>
                  {stageConfig.label}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
              </motion.div>

              <p className="mt-1.5 text-[9px] leading-snug text-muted-foreground/60">
                O contato avança automaticamente quando a conversa chegar nesta etapa.
              </p>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
