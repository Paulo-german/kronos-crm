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

  const linkContent = (
    <Link
      href={`/org/${orgSlug}/settings/credits`}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-4 text-sm font-medium text-muted-foreground transition-all duration-1000 hover:bg-primary/10 hover:text-primary',
        isCollapsed ? 'mx-2 justify-center' : 'px-3',
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
        <TooltipContent side="right" sideOffset={10} className="w-44 space-y-1.5 p-3 shadow-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Créditos IA</span>
            <span className={cn('tabular-nums', usedPercent > 90 ? 'text-red-300' : 'text-white/70')}>{availablePercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                usedPercent > 90 ? 'bg-red-300' : 'bg-white/90',
              )}
              style={{ width: `${availablePercent}%` }}
            />
          </div>
          <p className="text-[10px] text-white/50">
            {formatNumber(available)} / {formatNumber(monthlyLimit)} disponíveis
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
