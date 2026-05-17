import Link from 'next/link'
import { Target } from 'lucide-react'
import { getGoalsWithProgress } from '@/_data-access/goal/get-goals'
import { GoalProgressCard } from '@/_components/goal-progress-card/goal-progress-card'
import type { RBACContext } from '@/_lib/rbac'

interface PipelineGoalsStripProps {
  ctx: RBACContext
  orgSlug: string
}

export async function PipelineGoalsStrip({ ctx, orgSlug }: PipelineGoalsStripProps) {
  const goalsWithProgress = await getGoalsWithProgress(ctx)

  // Filtra apenas metas com scope PIPELINE
  const pipelineGoals = goalsWithProgress.filter((goal) => goal.scope === 'PIPELINE')

  if (pipelineGoals.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/50 px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Target className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma meta de pipeline configurada
          </p>
          <p className="text-xs text-muted-foreground/70">
            Configure metas de pipeline em{' '}
            <Link
              href={`/org/${orgSlug}/settings/goals`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Configurações → Metas
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pipelineGoals.map((goal) => (
        <GoalProgressCard
          key={goal.id}
          goal={goal}
          progress={goal.progress}
          variant="compact"
        />
      ))}
    </div>
  )
}
