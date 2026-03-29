import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { hasModuleAccess } from '@/_data-access/module/check-module-access'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { AgentTabsNav } from './_components/agent-tabs-nav'

interface AiAgentLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const AiAgentLayout = async ({ children, params }: AiAgentLayoutProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  const hasAccess = await hasModuleAccess(orgId, 'ai-agent')
  if (!hasAccess) {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  // Verifica se o plano suporta equipes (Light não suporta — ai.max_agents = 1)
  const { plan } = await getPlanLimits(orgId)
  const canAccessGroups = plan !== 'light' && plan !== null

  return (
    <>
      <AgentTabsNav orgSlug={orgSlug} canAccessGroups={canAccessGroups} />
      {children}
    </>
  )
}

export default AiAgentLayout
