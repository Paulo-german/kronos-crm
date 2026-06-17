'use client'

import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import CollapsibleCard from './collapsible-card'

interface CompanyOwnerWidgetProps {
  deal: DealDetailsDto
}

const CompanyOwnerWidget = ({ deal }: CompanyOwnerWidgetProps) => {
  return (
    <CollapsibleCard
      title="Responsável"
      summary={deal.assigneeName || 'Sem responsável definido'}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
          {deal.assigneeName
            ? deal.assigneeName
                .split(' ')
                .map((word) => word[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()
            : '?'}
        </div>
        <p className="text-sm font-medium">
          {deal.assigneeName || 'Não atribuído'}
        </p>
      </div>
    </CollapsibleCard>
  )
}

export default CompanyOwnerWidget
