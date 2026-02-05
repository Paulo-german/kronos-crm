import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getUserOrganizations } from '@/_data-access/organization/get-user-organizations'
import { OrgSelectorClient } from './_components/org-selector-client'

const OrgSelectorPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const organizations = await getUserOrganizations(user.id)

  // Se o usuário tem apenas uma org, redireciona direto
  if (organizations.length === 1) {
    redirect(`/org/${organizations[0].slug}/dashboard`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <OrgSelectorClient organizations={organizations} />
    </div>
  )
}

export default OrgSelectorPage
