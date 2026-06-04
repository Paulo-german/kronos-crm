import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac/permissions'
import { getGoalsWithProgress } from '@/_data-access/goal/get-goals'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { BackButton } from '@/_components/layout/back-button'
import { CreateGoalButton } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/settings/goals/_components/create-goal-button'
import { GoalsDataTable } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/settings/goals/_components/goals-data-table'
import { GoalEmptyState } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/settings/goals/_components/goal-empty-state'

interface GoalsSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const GoalsSettingsPage = async ({ params }: GoalsSettingsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  const [goals, pipelines, membersResult] = await Promise.all([
    getGoalsWithProgress(ctx),
    getOrgPipelines(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
  ])

  const members = membersResult.accepted

  return (
    <div className="space-y-6">
      <BackButton href={`/org/${orgSlug}/crm/settings`} />
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
