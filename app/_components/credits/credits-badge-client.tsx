'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Progress } from '@/_components/ui/progress'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'

interface CreditsBadgeClientProps {
  available: number
  monthlyLimit: number
  orgSlug: string
}

const formatNumber = (value: number) => value.toLocaleString('pt-BR')

export const CreditsBadgeClient = ({
  available,
  monthlyLimit,
  orgSlug,
}: CreditsBadgeClientProps) => {
  const { isCollapsed } = useSidebar()

  if (monthlyLimit <= 0) {
    return null
  }

  const used = Math.max(monthlyLimit - available, 0)
  const usedPercent = Math.min(Math.round((used / monthlyLimit) * 100), 100)
  const availablePercent = 100 - usedPercent

  const fractionColor =
    usedPercent > 90 ? 'text-destructive' : 'text-muted-foreground/70'

  const progressColor =
    usedPercent > 90 ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'

  const tooltipText = `${formatNumber(available)}/${formatNumber(monthlyLimit)} créditos IA (${availablePercent}%)`

  const linkContent = (
    <Link
      href={`/org/${orgSlug}/settings/credits`}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-4 pl-0 pr-0 text-sm font-medium text-muted-foreground transition-all duration-1000 hover:bg-primary/10 hover:text-primary',
        isCollapsed ? 'ml-2 mr-2 pl-3 pr-0' : 'px-3',
      )}
    >
      <div className="flex items-center">
        <Zap className="h-4 w-4 shrink-0" />
      </div>
      <div
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] overflow-hidden whitespace-nowrap transition-all duration-1000',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-full opacity-100 delay-100',
        )}
      >
        <div className="flex items-center justify-between">
          <span>Créditos IA</span>
          <span className={cn('text-xs tabular-nums', fractionColor)}>
            {formatNumber(available)}/{formatNumber(monthlyLimit)}
          </span>
        </div>
        <Progress
          value={availablePercent}
          className={cn('mt-1 h-1 bg-muted', progressColor)}
        />
      </div>
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
