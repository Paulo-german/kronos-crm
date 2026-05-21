import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { ProfileForm } from './_components/profile-form'
import SecurityCard from './_components/security-card'
import { BackButton } from '../_components/back-button'

const AccountProfilePage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userData = await getUserById(user.id)

  if (!userData) {
    redirect('/org')
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">
          Atualize suas informações pessoais.
        </p>
      </div>

      <ProfileForm user={userData} />

      <SecurityCard />
    </div>
  )
}

export default AccountProfilePage
