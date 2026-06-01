import { Target } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getGoalsWithProgress } from '@/_data-access/goal/get-goals'
import { GoalProgressCard } from '@/_components/goal-progress-card/goal-progress-card'
import type { DateRange } from '@/_data-access/reports/shared/reports-types'

interface TeamGoalsStripProps {
  orgSlug: string
  // dateRange é propagado pela página para manter a tira de metas no mesmo contexto temporal do
  // restante do relatório. Hoje não é consumido (ver LIMITAÇÃO CONHECIDA abaixo), mas faz parte do
  // contrato do componente para quando getGoalsWithProgress passar a aceitar período.
  dateRange: DateRange
}

export async function TeamGoalsStrip({ orgSlug }: TeamGoalsStripProps) {
  const ctx = await getOrgContext(orgSlug)

  // LIMITAÇÃO CONHECIDA: getGoalsWithProgress só aceita `ctx` — não recebe dateRange nem filtros.
  // O progresso é computado contra o próprio período da meta (periodStart/periodEnd), não contra o
  // dateRange/assignee selecionados na página. Ajustar isso exige alterar a assinatura de
  // getGoalsWithProgress/computeGoalProgress, o que está fora do escopo desta tarefa.
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
