import Link from 'next/link'
import { Target } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getGoalsWithProgress } from '@/_data-access/goal/get-goals'
import { GoalProgressCard } from '@/_components/goal-progress-card/goal-progress-card'

interface OverviewGoalsStripProps {
  orgSlug: string
}

export async function OverviewGoalsStrip({ orgSlug }: OverviewGoalsStripProps) {
  const ctx = await getOrgContext(orgSlug)
  const allGoals = await getGoalsWithProgress(ctx)

  const orgGoals = allGoals.filter((goal) => goal.scope === 'ORG')

  if (orgGoals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Target className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Nenhuma meta de organização configurada</p>
          <p className="text-xs text-muted-foreground">
            Configure metas de organização para acompanhar o progresso do time.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings/goals`}>Configurar metas</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {orgGoals.map((goalWithProgress) => (
        <GoalProgressCard
          key={goalWithProgress.id}
          goal={goalWithProgress}
          progress={goalWithProgress.progress}
          variant="compact"
        />
      ))}
    </div>
  )
}
