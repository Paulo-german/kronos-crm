'use client'

import Link from 'next/link'
import { Gem } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import type { TrialStatus } from '@/_data-access/billing/get-trial-status'
import type { PlanType } from '@/_lib/rbac/plan-limits'

interface PlanBadgeClientProps {
  phase: TrialStatus['phase']
  daysRemaining: number
  planName: PlanType | null
  orgSlug: string
}

const PLAN_LABELS: Record<string, string> = {
  light: 'Light',
  essential: 'Essential',
  scale: 'Scale',
  enterprise: 'Enterprise',
}

// Segue o padrao de deal status badges (bg-color/10 text-color border-color/20)
const PHASE_BADGE_STYLES: Record<TrialStatus['phase'], string> = {
  info: 'bg-[hsl(var(--kronos-blue)/0.1)] text-[hsl(var(--kronos-blue))] border-[hsl(var(--kronos-blue)/0.2)]',
  warning: 'bg-[hsl(var(--kronos-yellow)/0.1)] text-[hsl(var(--kronos-yellow))] border-[hsl(var(--kronos-yellow)/0.2)]',
  danger: 'bg-destructive/10 text-destructive border-destructive/20',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  none: '',
}

export const PlanBadgeClient = ({
  phase,
  daysRemaining,
  planName,
  orgSlug,
}: PlanBadgeClientProps) => {
  const { isCollapsed } = useSidebar()

  const label = planName ? PLAN_LABELS[planName] ?? planName : 'Free'

  const trialText = phase === 'expired'
    ? 'Expirado'
    : phase !== 'none'
      ? `${daysRemaining}d`
      : null

  const tooltipText = trialText ? `${label} · ${trialText}` : label

  const linkContent = (
    <Link
      href={`/org/${orgSlug}/settings/billing`}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-2 pl-0 pr-0 text-sm font-medium text-muted-foreground transition-all duration-1000 hover:bg-primary/10 hover:text-primary',
        isCollapsed ? 'ml-2 mr-2 pl-3 pr-0' : 'px-3',
      )}
    >
      <div className="flex items-center">
        <Gem className="h-4 w-4 shrink-0" />
      </div>
      <span
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-1000',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-auto opacity-100 delay-100',
        )}
      >
        {label}
        {trialText && (
          <Badge
            variant="outline"
            className={cn('shrink-0 text-[10px] px-1.5 py-0', PHASE_BADGE_STYLES[phase])}
          >
            {trialText}
          </Badge>
        )}
      </span>
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
