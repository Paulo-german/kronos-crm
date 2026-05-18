'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'

interface MockTimelineEvent {
  from: LifecycleStage | null
  to: LifecycleStage
  cause: string
  time: string
  user: string | null
}

const MOCK_EVENTS: MockTimelineEvent[] = [
  { from: null, to: LifecycleStage.LEAD, cause: 'Contato criado', time: 'há 30 dias', user: null },
  { from: LifecycleStage.LEAD, to: LifecycleStage.QUALIFIED, cause: 'Negócio criado', time: 'há 15 dias', user: null },
  { from: LifecycleStage.QUALIFIED, to: LifecycleStage.OPPORTUNITY, cause: 'Alteração manual', time: 'há 3 dias', user: 'João Silva' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
}

export const LifecycleTimelineSlide = () => {
  return (
    <div className="w-full max-w-[320px]">
      <div className="relative">
        {/* Linha vertical animada */}
        <motion.div
          className="absolute left-0 top-0 w-px bg-border/40"
          style={{ transformOrigin: 'top' }}
          initial={{ scaleY: 0, height: '100%' }}
          animate={{ scaleY: 1, height: '100%' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        <motion.div
          className="pl-5 space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {MOCK_EVENTS.map((event, index) => {
            const toConfig = LIFECYCLE_STAGE_CONFIG[event.to]
            const fromConfig = event.from ? LIFECYCLE_STAGE_CONFIG[event.from] : null

            const metaParts = [event.cause]
            if (event.user) metaParts.push(event.user)
            metaParts.push(event.time)

            return (
              <motion.div key={index} className="relative" variants={rowVariants}>
                {/* Dot na linha vertical */}
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

                <div className="flex items-center gap-1.5 flex-wrap">
                  {fromConfig && (
                    <>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${fromConfig.badgeClassName}`}
                      >
                        {fromConfig.label}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    </>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toConfig.badgeClassName}`}
                  >
                    {toConfig.label}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {metaParts.join(' · ')}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
