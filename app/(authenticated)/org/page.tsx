import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getUserOrganizations } from '@/_data-access/organization/get-user-organizations'
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
    getUserOrganizations(user.id),
    getUserById(user.id),
  ])

  // Se o usuário tem apenas uma org, redireciona direto (exceto se veio do switcher)
  if (organizations.length === 1 && show !== 'true') {
    redirect(`/org/${organizations[0].slug}/home`)
  }

  const topBarUser = {
    fullName: userData?.fullName ?? null,
    email: userData?.email ?? user.email ?? '',
    avatarUrl: userData?.avatarUrl ?? null,
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <AccountTopBar user={topBarUser} />
      <main className="flex flex-1 items-center justify-center px-4">
        <OrgSelectorClient
          organizations={organizations}
          userFirstName={userData?.fullName?.split(' ')[0] ?? null}
        />
      </main>
    </div>
  )
}

export default OrgSelectorPage
