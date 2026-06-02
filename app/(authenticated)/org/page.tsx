import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getUserOrganizationsWithModules } from '@/_data-access/organization/get-user-organizations-with-modules'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { AccountTopBar } from '@/_components/layout/account-top-bar'
import { OrgSelectorClient } from './_components/org-selector-client'

interface OrgSelectorPageProps {
  searchParams: Promise<{ show?: string }>
}

const OrgSelectorPage = async ({ searchParams }: OrgSelectorPageProps) => {
  const { show } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [organizations, userData] = await Promise.all([
    getUserOrganizationsWithModules(user.id),
    getUserById(user.id),
  ])

  // Orgs internas nunca fazem auto-redirect — passam pelo hub de seleção de produto
  const isInternalOrg = (grantType: string | null) => grantType === 'INTERNAL'

  // Auto-redirect apenas para orgs externas com uma única org (exceto se veio do switcher)
  if (organizations.length === 1 && show !== 'true' && !isInternalOrg(organizations[0].grantType)) {
    redirect(`/org/${organizations[0].slug}/crm/home`)
  }

  const topBarUser = {
    fullName: userData?.fullName ?? null,
    email: userData?.email ?? user.email ?? '',
    avatarUrl: userData?.avatarUrl ?? null,
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <AccountTopBar user={topBarUser} />
      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4">
        <OrgSelectorClient
          organizations={organizations}
          userFirstName={userData?.fullName?.split(' ')[0] ?? null}
        />
      </main>
    </div>
  )
}

export default OrgSelectorPage
