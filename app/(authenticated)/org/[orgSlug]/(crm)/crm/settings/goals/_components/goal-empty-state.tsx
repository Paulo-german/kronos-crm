import { Target } from 'lucide-react'
import { CreateGoalButton } from './create-goal-button'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

interface GoalEmptyStateProps {
  pipelines: OrgPipelineDto[]
  members: AcceptedMemberDto[]
}

export function GoalEmptyState({ pipelines, members }: GoalEmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Target className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Nenhuma meta configurada</h3>
          <p className="text-sm text-muted-foreground">
            Crie metas de vendas para acompanhar o desempenho da equipe em
            receita, negócios e atividades.
          </p>
        </div>
        <CreateGoalButton pipelines={pipelines} members={members} />
      </div>
    </div>
  )
}
