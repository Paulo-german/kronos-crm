'use client'

import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import DealInfoCard from './deal-info-card'
import ContactWidget from './contact-widget'
import CompanyOwnerWidget from './company-owner-widget'
import NotesSection from './notes-section'
import ActivityTimeline from './activity-timeline'

interface TabSummaryProps {
  deal: DealDetailsDto
  contacts: ContactDto[]
}

const TabSummary = ({ deal, contacts }: TabSummaryProps) => {
  return (
    <div className="space-y-6">
      {/* Grid Principal: 35% | 65% */}
      <div className="grid gap-6 lg:grid-cols-[35%_1fr]">
        {/* Coluna Esquerda: Contexto */}
        <div className="space-y-4">
          <DealInfoCard deal={deal} />
          <ContactWidget deal={deal} contacts={contacts} />
          <CompanyOwnerWidget deal={deal} />
        </div>

        {/* Coluna Direita: Histórico & Observações */}
        <div className="space-y-4">
          <NotesSection deal={deal} />
          <ActivityTimeline deal={deal} />
        </div>
      </div>
    </div>
  )
}

export default TabSummary
