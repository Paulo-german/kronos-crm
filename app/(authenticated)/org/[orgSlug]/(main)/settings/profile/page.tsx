import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { redirect } from 'next/navigation'
import { ProfileForm } from './_components/profile-form'
import SecurityCard from './_components/security-card'

interface ProfileSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProfileSettingsPage = async ({ params }: ProfileSettingsPageProps) => {
  const { orgSlug } = await params
  const { userId } = await getOrgContext(orgSlug)

  const user = await getUserById(userId)

  if (!user) {
    redirect(`/org/${orgSlug}/settings`)
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">
          Atualize suas informações pessoais.
        </p>
      </div>

      <ProfileForm user={user} />

      <SecurityCard />
    </div>
  )
}

export default ProfileSettingsPage
