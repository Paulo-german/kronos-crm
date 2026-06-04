import { Users } from 'lucide-react'
import { QuotaHint } from '@/_components/trial/quota-hint'
import { SquadCard } from './squad-card'
import { CreateSquadButton } from './create-squad-button'
import type { SquadDto } from '@/_data-access/squad/get-squads'
import type { MemberRole } from '@prisma/client'

interface SquadsTabProps {
  squads: SquadDto[]
  withinQuota: boolean
  orgId: string
  orgSlug: string
  userRole: MemberRole
}

export function SquadsTab({
  squads,
  withinQuota,
  orgId,
  orgSlug,
  userRole,
}: SquadsTabProps) {
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Equipes</h2>
          <p className="text-sm text-muted-foreground">
            Organize seus membros em times com papéis e modelos de distribuição
            específicos.
          </p>
          <QuotaHint orgId={orgId} entity="squad" />
        </div>
        {canManage && (
          <CreateSquadButton withinQuota={withinQuota} orgSlug={orgSlug} />
        )}
      </div>

      {/* Estado vazio */}
      {squads.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Nenhuma equipe criada</p>
            <p className="text-sm text-muted-foreground">
              Crie equipes para organizar as funções de cada membro e modelos de
              distribuição de leads.
            </p>
          </div>
          {canManage && withinQuota && (
            <CreateSquadButton withinQuota={withinQuota} orgSlug={orgSlug} />
          )}
        </div>
      )}

      {/* Grid de cards */}
      {squads.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((squad) => (
            <SquadCard
              key={squad.id}
              squad={squad}
              canManage={canManage}
              orgSlug={orgSlug}
            />
          ))}
        </div>
      )}
    </div>
  )
}
