'use client'

import type { ReactNode } from 'react'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import DealInfoCard from './deal-info-card'
import CompanyOwnerWidget from './company-owner-widget'
import NotesSection from './notes-section'
import ActivityTimeline from './activity-timeline'

interface TabSummaryProps {
  deal: DealDetailsDto
  contactsSlot: ReactNode
  onTabChange?: (tab: string) => void
}

const TabSummary = ({ deal, contactsSlot, onTabChange }: TabSummaryProps) => {
  return (
    <div className="space-y-6">
      {/* Grid Principal: 35% | 65% */}
      <div className="grid gap-6 lg:grid-cols-[35%_1fr]">
        {/* Coluna Esquerda: Contexto */}
        <div className="space-y-4">
          <DealInfoCard deal={deal} onTabChange={onTabChange} />
          {contactsSlot}
          <CompanyOwnerWidget deal={deal} />
        </div>

        {/* Coluna Direita: Histórico & Observações */}
        <div className="space-y-4">
          <NotesSection deal={deal} />
          <ActivityTimeline
            dealId={deal.id}
            activities={deal.activities}
            totalActivities={deal.totalActivities}
          />
        </div>
      </div>
    </div>
  )
}

export default TabSummary
