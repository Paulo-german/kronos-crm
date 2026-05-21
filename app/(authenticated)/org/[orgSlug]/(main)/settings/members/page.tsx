import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getSquads } from '@/_data-access/squad/get-squads'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { QuotaHint } from '@/_components/trial/quota-hint'
import { MemberList } from './_components/member-list'
import InviteMemberDialog from './_components/invite-member-dialog'
import { PiiToggleCard } from './_components/pii-toggle-card'
import { SupportSection } from './_components/support-section'
import { SquadsTab } from './_components/squads-tab'
import { MembersPageClient } from './_components/members-page-client'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'

interface MembersPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { orgSlug } = await params

  const ctx = await getOrgContext(orgSlug)
  const { orgId, userRole, hidePiiFromMembers } = ctx

  // RBAC: Apenas ADMIN/OWNER podem acessar esta página
  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/home`)
  }

  const [{ accepted, pending, support }, memberQuota, squads, squadQuota] =
    await Promise.all([
      getOrganizationMembers(orgId),
      checkPlanQuota(orgId, 'member'),
      getSquads(ctx),
      checkPlanQuota(orgId, 'squad'),
    ])

  const membersContent = (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Membros</h1>
          <p className="text-muted-foreground">
            Gerencie quem tem acesso à organização.
          </p>
          <QuotaHint orgId={orgId} entity="member" />
        </div>
        {(userRole === 'ADMIN' || userRole === 'OWNER') && (
          <InviteMemberDialog withinQuota={memberQuota.withinQuota} />
        )}
      </div>

      {/* Toggle de proteção de dados PII */}
      <PiiToggleCard defaultValue={hidePiiFromMembers} />

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

      <SupportSection members={support} />
    </div>
  )

  const squadsContent = (
    <SquadsTab
      squads={squads}
      withinQuota={squadQuota.withinQuota}
      orgId={orgId}
      orgSlug={orgSlug}
      userRole={userRole}
    />
  )

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

      <MembersPageClient
        membersContent={membersContent}
        squadsContent={squadsContent}
      />
    </div>
  )
}
