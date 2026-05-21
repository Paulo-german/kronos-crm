import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getSquadById } from '@/_data-access/squad/get-squad-by-id'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { SquadDistributionForm } from './_components/squad-distribution-form'
import { SquadLoyaltyCard } from './_components/squad-loyalty-card'
import { SquadMembersSection } from './_components/squad-members-section'
import type { SquadType } from '@prisma/client'

interface SquadDetailPageProps {
  params: Promise<{ orgSlug: string; squadId: string }>
}

const SQUAD_TYPE_LABELS: Record<SquadType, string> = {
  SALES: 'Vendas',
  SUPPORT: 'Suporte',
  CS: 'Customer Success',
  GENERAL: 'Geral',
}

export default async function SquadDetailPage({ params }: SquadDetailPageProps) {
  const { orgSlug, squadId } = await params

  const ctx = await getOrgContext(orgSlug)
  const { orgId, userRole } = ctx

  const [squad, { accepted: orgMembers }] = await Promise.all([
    getSquadById(ctx, squadId),
    getOrganizationMembers(orgId),
  ])

  if (!squad) {
    notFound()
  }

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings/members?tab=squads`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{squad.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">{SQUAD_TYPE_LABELS[squad.type]}</Badge>
              {squad.isDefault && <Badge variant="secondary">Padrão</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Descrição */}
      {squad.description && (
        <p className="text-muted-foreground">{squad.description}</p>
      )}

      {/* Membros */}
      <SquadMembersSection
        squad={squad}
        orgMembers={orgMembers}
        canManage={canManage}
        orgSlug={orgSlug}
      />

      {/* Fidelização */}
      <SquadLoyaltyCard squad={squad} canManage={canManage} />

      {/* Modelo de distribuição */}
      <SquadDistributionForm squad={squad} canManage={canManage} />
    </div>
  )
}
