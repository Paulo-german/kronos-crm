'use client'

import { Layers } from 'lucide-react'
import type { StalledDealsResult } from '@/_data-access/copilot/shared/insights-types'
import { InsightCard } from './insight-card'

interface TabStalledPipelineProps {
  initial: StalledDealsResult
  orgSlug: string
}

export function TabStalledPipeline({ initial, orgSlug }: TabStalledPipelineProps) {
  const deals = initial.data

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Layers className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhum deal estagnado</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {deals.map((deal) => {
        const subtitle = [
          `${deal.pipelineName} · ${deal.stageName}`,
          deal.assignedToName,
        ]
          .filter(Boolean)
          .join(' · ')

        const meta: Array<{ label: string; value: string }> = []
        if (deal.value !== null) {
          meta.push({
            label: 'Valor',
            value: `R$ ${deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          })
        }

        return (
          <InsightCard
            key={deal.id}
            title={deal.title}
            subtitle={subtitle}
            driver={`Sem movimentação há ${deal.daysSinceLastActivity} dias`}
            meta={meta}
            primaryAction={{
              label: 'Abrir deal',
              href: `/org/${orgSlug}/crm/deals/${deal.id}`,
            }}
          />
        )
      })}
    </div>
  )
}
