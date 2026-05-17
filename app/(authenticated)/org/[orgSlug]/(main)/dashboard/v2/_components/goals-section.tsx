import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { getGoalsWithProgress } from '@/_data-access/goal/get-goals'
import { GoalProgressCard } from '@/_components/goal-progress-card/goal-progress-card'
import { GoalsEmptyState } from './goals-empty-state'

interface GoalsSectionProps {
  ctx: RBACContext
  orgSlug: string
}

export async function GoalsSection({ ctx, orgSlug }: GoalsSectionProps) {
  const allGoals = await getGoalsWithProgress(ctx)
  const elevated = isElevated(ctx.userRole)

  // OWNER/ADMIN vê metas de org e pipeline (não metas individuais — poluiria em times grandes).
  // MEMBER vê apenas suas próprias metas individuais.
  const visibleGoals = elevated
    ? allGoals.filter((goal) => goal.scope === 'ORG' || goal.scope === 'PIPELINE')
    : allGoals.filter((goal) => goal.scope === 'MEMBER' && goal.targetUserId === ctx.userId)

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Metas do Período</h2>
      {visibleGoals.length === 0 ? (
        <GoalsEmptyState isElevated={elevated} orgSlug={orgSlug} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleGoals.map((goal) => (
            <GoalProgressCard
              key={goal.id}
              goal={goal}
              progress={goal.progress}
              variant="compact"
              primaryAction={
                elevated
                  ? { label: 'Ver detalhes', href: `/org/${orgSlug}/settings/goals` }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}
