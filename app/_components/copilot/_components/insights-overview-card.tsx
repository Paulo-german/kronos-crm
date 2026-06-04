'use client'

import { Users, TrendingUp } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import type { InsightsBucketDto, InsightsOverviewDto, ScoreBucketLabel } from '@/_data-access/copilot/shared/insights-types'

interface InsightsOverviewCardProps {
  overview: InsightsOverviewDto
}

const scoreLabelText: Record<ScoreBucketLabel, string> = {
  red: 'Em risco',
  yellow: 'Atenção',
  green: 'Saudável',
}

const scoreNumberClass: Record<ScoreBucketLabel, string> = {
  red: 'text-destructive',
  yellow: 'text-yellow-500',
  green: 'bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent',
}

const scoreLabelClass: Record<ScoreBucketLabel, string> = {
  red: 'text-destructive',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
}

const MotionCard = motion.create(Card)

function BucketCard({
  title,
  bucket,
  icon: Icon,
}: {
  title: string
  bucket: InsightsBucketDto
  icon: React.ElementType
}) {
  const shouldReduce = useReducedMotion()

  return (
    <MotionCard
      className="group relative overflow-hidden hover:border-primary/50 transition-colors"
      style={{ transformStyle: 'preserve-3d' }}
      whileHover={
        shouldReduce
          ? {}
          : {
              rotateX: -2,
              rotateY: 2,
              scale: 1.01,
              transition: { type: 'spring', stiffness: 260, damping: 20 },
            }
      }
    >
      {/* Glow radial no hover */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.15),transparent_70%)]" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {bucket.total === 0 ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tabular-nums text-muted-foreground/30">—</span>
            </div>
            <p className="text-sm text-muted-foreground">Aguardando primeiro cálculo de score.</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-5xl font-bold tabular-nums',
                  scoreNumberClass[bucket.scoreLabel],
                )}
              >
                {bucket.score}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
              <span
                className={cn('ml-2 text-sm font-medium', scoreLabelClass[bucket.scoreLabel])}
              >
                {scoreLabelText[bucket.scoreLabel]}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-destructive font-medium tabular-nums">{bucket.atRisk}</span>
                <span className="text-muted-foreground">em risco</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400 font-medium tabular-nums">{bucket.needsAttention}</span>
                <span className="text-muted-foreground">atenção</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium tabular-nums">{bucket.healthy}</span>
                <span className="text-muted-foreground">saudáveis</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground tabular-nums">
              {bucket.total} avaliados
            </p>
          </>
        )}
      </CardContent>
    </MotionCard>
  )
}

export function InsightsOverviewCard({ overview }: InsightsOverviewCardProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Saúde da carteira
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BucketCard title="Clientes" bucket={overview.customers} icon={Users} />
        <BucketCard title="Pipeline" bucket={overview.pipeline} icon={TrendingUp} />
      </div>
    </div>
  )
}
