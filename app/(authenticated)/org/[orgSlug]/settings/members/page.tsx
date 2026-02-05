import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getMembershipOrThrow } from '@/_data-access/organization/validate-membership'
import { createClient } from '@/_lib/supabase/server'
import { MemberList } from './_components/member-list'
import { InviteMemberDialog } from './_components/invite-member-dialog'
import { redirect } from 'next/navigation'

interface MembersPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { orgSlug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Validar acesso e pegar orgId
  const { orgId, userRole } = await getMembershipOrThrow(user.id, orgSlug)

  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'OWNER'

  // RBAC: Apenas ADMIN/OWNER podem acessar esta página
  if (!isAdminOrOwner) {
    redirect(`/org/${orgSlug}/dashboard`)
  }

  // Buscar membros
  const { accepted, pending } = await getOrganizationMembers(orgId)

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Membros</h1>
          <p className="text-muted-foreground">
            Gerencie quem tem acesso à organização.
          </p>
        </div>
        {isAdminOrOwner && <InviteMemberDialog />}
      </div>

      <div className="space-y-8">
        <MemberList
          title="Membros Ativos"
          members={accepted}
          type="ACCEPTED"
          currentUserRole={userRole}
        />

        {pending.length > 0 && (
          <MemberList
            title="Convites Pendentes"
            members={pending}
            type="PENDING"
            currentUserRole={userRole}
          />
        )}
      </div>
    </div>
  )
}
