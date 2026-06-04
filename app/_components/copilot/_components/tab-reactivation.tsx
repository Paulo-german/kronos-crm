'use client'

import { UserCheck } from 'lucide-react'
import type { ReactivationCandidatesResult } from '@/_data-access/copilot/shared/insights-types'
import { InsightCard } from './insight-card'

interface TabReactivationProps {
  initial: ReactivationCandidatesResult
  orgSlug: string
}

export function TabReactivation({ initial, orgSlug }: TabReactivationProps) {
  const candidates = initial.data

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <UserCheck className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhum cliente para reativação</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((candidate) => {
        const subtitle = candidate.assignedToName
          ? `Cliente dormant · ${candidate.assignedToName}`
          : 'Cliente dormant'

        const driver = candidate.daysSinceLastPurchase
          ? `Sem compra há ${candidate.daysSinceLastPurchase} dias`
          : 'Sem histórico de compras'

        return (
          <InsightCard
            key={candidate.id}
            title={candidate.name}
            subtitle={subtitle}
            driver={driver}
            meta={[
              {
                label: 'LTV',
                value: `R$ ${candidate.ltvBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              },
            ]}
            primaryAction={{
              label: 'Abrir contato',
              href: `/org/${orgSlug}/contacts/${candidate.id}`,
            }}
          />
        )
      })}
    </div>
  )
}
