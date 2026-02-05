import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getOrganizationBySlug } from '@/_data-access/organization/get-organization-by-slug'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { OrganizationProvider } from '@/_providers/organization-provider'

interface OrgLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params

  // Verificar autenticação
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar organização
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    redirect('/org?clear_last_org=true')
  }

  // Validar membership
  const membership = await validateMembership(user.id, orgSlug)

  if (!membership.isValid || !membership.userRole) {
    redirect('/org?clear_last_org=true')
  }

  return (
    <OrganizationProvider
      organization={organization}
      userRole={membership.userRole}
    >
      {children}
    </OrganizationProvider>
  )
}
