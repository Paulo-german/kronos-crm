import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { hasModuleAccess } from '@/_data-access/module/check-module-access'

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

  return <>{children}</>
}

export default AiAgentLayout
