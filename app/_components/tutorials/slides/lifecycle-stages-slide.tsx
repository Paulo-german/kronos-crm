'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import {
  LIFECYCLE_STAGE_CONFIG,
  LIFECYCLE_STAGE_ORDER,
} from '@/_lib/lifecycle/lifecycle-stage-config'
import { LifecycleStage } from '@prisma/client'

const STAGE_DESCRIPTIONS: Record<LifecycleStage, string> = {
  [LifecycleStage.COLD]: 'lista fria, ainda não respondeu',
  [LifecycleStage.LEAD]: 'ainda está conhecendo você',
  [LifecycleStage.QUALIFIED]: 'demonstrou interesse real',
  [LifecycleStage.OPPORTUNITY]: 'negociação em andamento',
  [LifecycleStage.CUSTOMER]: 'venda fechada com sucesso',
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export const LifecycleStagesSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[280px] flex-col items-center gap-1"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {LIFECYCLE_STAGE_ORDER.map((stage, index) => {
        const config = LIFECYCLE_STAGE_CONFIG[stage]
        const Icon = config.icon
        const isLast = index === LIFECYCLE_STAGE_ORDER.length - 1

        return (
          <motion.div
            key={stage}
            className="flex w-full flex-col items-center gap-1"
            variants={itemVariants}
          >
            <div
              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 ${config.badgeClassName}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${config.colorClassName}`} />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{config.label}</span>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {STAGE_DESCRIPTIONS[stage]}
                </p>
              </div>
            </div>

            {!isLast && (
              <motion.div variants={itemVariants}>
                <motion.div
                  animate={{ y: [0, 3, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.3 + 0.8,
                  }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
}
