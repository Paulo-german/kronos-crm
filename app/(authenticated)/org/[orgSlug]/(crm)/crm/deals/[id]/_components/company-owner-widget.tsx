'use client'

import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import CollapsibleCard from './collapsible-card'

interface CompanyOwnerWidgetProps {
  deal: DealDetailsDto
}

const CompanyOwnerWidget = ({ deal }: CompanyOwnerWidgetProps) => {
  const initials = deal.assigneeName
    ? deal.assigneeName
        .split(' ')
        .map((word) => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '?'

  return (
    <CollapsibleCard
      title="Responsável"
      summary={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <p className="truncate text-sm font-medium text-foreground">
            {deal.assigneeName || 'Sem responsável definido'}
          </p>
        </div>
      }
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {deal.assigneeName || 'Não atribuído'}
          </p>
          <p className="text-xs text-muted-foreground">
            Responsável pela negociação
          </p>
        </div>
      </div>
    </CollapsibleCard>
  )
}

export default CompanyOwnerWidget
