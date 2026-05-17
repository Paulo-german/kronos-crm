import { Target } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getGoalsWithProgress } from '@/_data-access/goal/get-goals'
import { GoalProgressCard } from '@/_components/goal-progress-card/goal-progress-card'

interface TeamGoalsStripProps {
  orgSlug: string
}

export async function TeamGoalsStrip({ orgSlug }: TeamGoalsStripProps) {
  const ctx = await getOrgContext(orgSlug)
  const allGoals = await getGoalsWithProgress(ctx)

  const memberGoals = allGoals.filter((goal) => goal.scope === 'MEMBER')

  if (memberGoals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
        <Target className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma meta individual configurada.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {memberGoals.map((goalWithProgress) => (
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
