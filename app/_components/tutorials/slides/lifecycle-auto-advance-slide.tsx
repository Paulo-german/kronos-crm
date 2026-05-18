'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Pencil } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'

interface AutoAdvanceRule {
  icon: React.ComponentType<{ className?: string }>
  iconColorClassName: string
  causeLabel: string
  badge: string
  badgeClassName: string
  tag: 'auto' | 'ia' | 'manual'
}

const TAG_STYLES: Record<AutoAdvanceRule['tag'], string> = {
  auto: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  ia: 'bg-primary/10 text-primary border-primary/20',
  manual: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

const TAG_LABELS: Record<AutoAdvanceRule['tag'], string> = {
  auto: 'Auto',
  ia: 'IA',
  manual: 'Manual',
}

const RULES: AutoAdvanceRule[] = [
  {
    icon: LIFECYCLE_STAGE_CONFIG[LifecycleStage.LEAD].icon,
    iconColorClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.LEAD].colorClassName,
    causeLabel: 'Inbox, WhatsApp ou captura',
    badge: LIFECYCLE_STAGE_CONFIG[LifecycleStage.LEAD].label,
    badgeClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.LEAD].badgeClassName,
    tag: 'auto',
  },
  {
    icon: LIFECYCLE_STAGE_CONFIG[LifecycleStage.QUALIFIED].icon,
    iconColorClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.QUALIFIED].colorClassName,
    causeLabel: 'Agente de IA ou você',
    badge: LIFECYCLE_STAGE_CONFIG[LifecycleStage.QUALIFIED].label,
    badgeClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.QUALIFIED].badgeClassName,
    tag: 'ia',
  },
  {
    icon: LIFECYCLE_STAGE_CONFIG[LifecycleStage.OPPORTUNITY].icon,
    iconColorClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.OPPORTUNITY].colorClassName,
    causeLabel: 'Negócio criado',
    badge: LIFECYCLE_STAGE_CONFIG[LifecycleStage.OPPORTUNITY].label,
    badgeClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.OPPORTUNITY].badgeClassName,
    tag: 'auto',
  },
  {
    icon: LIFECYCLE_STAGE_CONFIG[LifecycleStage.CUSTOMER].icon,
    iconColorClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.CUSTOMER].colorClassName,
    causeLabel: 'Negócio ganho',
    badge: LIFECYCLE_STAGE_CONFIG[LifecycleStage.CUSTOMER].label,
    badgeClassName: LIFECYCLE_STAGE_CONFIG[LifecycleStage.CUSTOMER].badgeClassName,
    tag: 'auto',
  },
  {
    icon: Pencil,
    iconColorClassName: 'text-zinc-400',
    causeLabel: 'Você mesmo (admin pode regredir)',
    badge: 'Qualquer estágio',
    badgeClassName: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    tag: 'manual',
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
}

export const LifecycleAutoAdvanceSlide = () => {
  return (
    <motion.div
      className="flex w-full max-w-[320px] flex-col gap-1.5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {RULES.map((rule) => {
        const Icon = rule.icon

        return (
          <motion.div
            key={rule.causeLabel}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
            variants={itemVariants}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${rule.iconColorClassName}`} />
            <span className="flex-1 truncate text-[11px] font-medium text-foreground">
              {rule.causeLabel}
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/30" />
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${rule.badgeClassName}`}
            >
              {rule.badge}
            </span>
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${TAG_STYLES[rule.tag]}`}
            >
              {TAG_LABELS[rule.tag]}
            </span>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
