import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { hasModuleAccess } from '@/_data-access/module/check-module-access'

interface CrmLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const CrmLayout = async ({ children, params }: CrmLayoutProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  const hasAccess = await hasModuleAccess(orgId, 'crm')
  if (!hasAccess) {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  return <>{children}</>
}

export default CrmLayout
