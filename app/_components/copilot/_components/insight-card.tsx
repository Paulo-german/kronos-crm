'use client'

import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Card, CardContent, CardFooter, CardHeader } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { ScoreBadge } from './score-badge'
import type { ScoreBucketLabel } from '@/_data-access/copilot/shared/insights-types'

interface InsightCardAction {
  label: string
  href?: string
  onClick?: () => void
}

interface InsightCardMeta {
  label: string
  value: string
}

interface InsightCardProps {
  title: string
  subtitle: string
  scoreBadge?: { value: number; label: ScoreBucketLabel }
  driver: string
  meta?: InsightCardMeta[]
  primaryAction: InsightCardAction
  secondaryActions?: InsightCardAction[]
}

const MotionCard = motion.create(Card)

function ActionButton({ action }: { action: InsightCardAction }) {
  if (action.href) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

export function InsightCard({
  title,
  subtitle,
  scoreBadge,
  driver,
  meta,
  primaryAction,
  secondaryActions,
}: InsightCardProps) {
  const shouldReduce = useReducedMotion()
  const hasSecondaryActions = secondaryActions && secondaryActions.length > 0

  return (
    <MotionCard
      className="group flex flex-col hover:border-primary/50 transition-colors relative overflow-hidden"
      style={{ transformStyle: 'preserve-3d' }}
      whileHover={
        shouldReduce
          ? {}
          : {
              rotateX: -3,
              rotateY: 3,
              scale: 1.02,
              transition: { type: 'spring', stiffness: 260, damping: 20 },
            }
      }
    >
      {/* Glow radial no hover */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.15),transparent_70%)]" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {scoreBadge && (
              <ScoreBadge
                score={scoreBadge.value}
                label={scoreBadge.label}
                size="md"
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>

          {hasSecondaryActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Mais ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {secondaryActions.map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.onClick}
                    asChild={!!action.href}
                  >
                    {action.href ? (
                      <Link href={action.href}>{action.label}</Link>
                    ) : (
                      action.label
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground">{driver}</p>
        {meta && meta.length > 0 && (
          <div className="mt-2 space-y-1">
            {meta.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">{item.label}:</span>
                <span className="tabular-nums font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <ActionButton action={primaryAction} />
      </CardFooter>
    </MotionCard>
  )
}
