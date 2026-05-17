import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac/permissions'
import { getGoalsWithProgress } from '@/_data-access/goal/get-goals'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { Button } from '@/_components/ui/button'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { CreateGoalButton } from './_components/create-goal-button'
import { GoalsDataTable } from './_components/goals-data-table'
import { GoalEmptyState } from './_components/goal-empty-state'

interface GoalsSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const GoalsSettingsPage = async ({ params }: GoalsSettingsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/dashboard`)
  }

  const [goals, pipelines, membersResult] = await Promise.all([
    getGoalsWithProgress(ctx),
    getOrgPipelines(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
  ])

  const members = membersResult.accepted

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Header>
        <HeaderLeft>
          <HeaderTitle>Metas de Vendas</HeaderTitle>
          <HeaderSubTitle>
            Configure metas de receita, negócios e atividades para a sua
            organização.
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateGoalButton pipelines={pipelines} members={members} />
        </HeaderRight>
      </Header>

      {goals.length === 0 ? (
        <GoalEmptyState pipelines={pipelines} members={members} />
      ) : (
        <GoalsDataTable data={goals} pipelines={pipelines} members={members} />
      )}
    </div>
  )
}

export default GoalsSettingsPage
