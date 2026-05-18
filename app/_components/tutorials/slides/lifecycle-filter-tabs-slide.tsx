'use client'

import { motion } from 'framer-motion'
import { LifecycleStage } from '@prisma/client'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'

interface MockTab {
  label: string
  count: number
  active: boolean
  stage: LifecycleStage | null
}

const MOCK_TABS: MockTab[] = [
  { label: 'Todos', count: 84, active: false, stage: null },
  { label: 'Lead', count: 32, active: true, stage: LifecycleStage.LEAD },
  { label: 'Qualificado', count: 21, active: false, stage: LifecycleStage.QUALIFIED },
  { label: 'Oportunidade', count: 18, active: false, stage: LifecycleStage.OPPORTUNITY },
  { label: 'Cliente', count: 13, active: false, stage: LifecycleStage.CUSTOMER },
]

export const LifecycleFilterTabsSlide = () => {
  return (
    <motion.div
      className="w-full max-w-[320px]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="grid grid-cols-5 h-10 w-full rounded-md border border-border/50 bg-muted/30 p-1 gap-0.5">
        {MOCK_TABS.map((tab) => {
          const stageConfig = tab.stage ? LIFECYCLE_STAGE_CONFIG[tab.stage] : null
          const Icon = stageConfig?.icon ?? null

          return (
            <div
              key={tab.label}
              className={`relative flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium ${
                tab.active
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.active && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                  initial={{ scaleX: 0.8 }}
                  animate={{ scaleX: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
              {Icon ? (
                // Tabs de estágio: só ícone + contagem
                <span className="relative z-10 flex flex-col items-center gap-0.5">
                  <Icon className={`h-3 w-3 shrink-0 ${stageConfig?.colorClassName}`} />
                  <span className="rounded-full bg-muted px-1 text-[8px] font-semibold leading-none text-muted-foreground">
                    {tab.count}
                  </span>
                </span>
              ) : (
                // Tab "Todos": label + contagem
                <span className="relative z-10 flex items-center gap-1">
                  <span className="text-[10px] font-medium">{tab.label}</span>
                  <span className="rounded-full bg-muted px-1 text-[8px] font-semibold leading-none text-muted-foreground">
                    {tab.count}
                  </span>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Labels abaixo das tabs */}
      <div className="mt-1 grid grid-cols-5 gap-0.5 px-1">
        {MOCK_TABS.map((tab) => (
          <p key={tab.label} className="truncate text-center text-[9px] text-muted-foreground/50">
            {tab.label}
          </p>
        ))}
      </div>

      <motion.p
        className="mt-2 text-center text-[11px] text-muted-foreground/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        Clique em uma aba para filtrar a lista
      </motion.p>
    </motion.div>
  )
}
