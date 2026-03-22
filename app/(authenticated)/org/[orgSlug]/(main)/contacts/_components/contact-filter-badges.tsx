'use client'

import { X } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import type { ContactFilters } from '../_lib/contact-filters'
import type { CompanyDto } from '@/_data-access/company/get-companies'

interface ContactFilterBadgesProps {
  filters: ContactFilters
  companyOptions: CompanyDto[]
  onFiltersChange: (filters: Partial<ContactFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function ContactFilterBadges({
  filters,
  companyOptions,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters,
}: ContactFilterBadgesProps) {
  if (!hasActiveFilters) return null

  const companyName = filters.companyId
    ? companyOptions.find((company) => company.id === filters.companyId)?.name
    : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badge de empresa */}
      {filters.companyId && companyName && (
        <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
          Empresa: {companyName}
          <button
            onClick={() => onFiltersChange({ companyId: null })}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label="Remover filtro de empresa"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Badge de decisor */}
      {filters.isDecisionMaker !== null && (
        <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
          Decisor: {filters.isDecisionMaker ? 'Sim' : 'Não'}
          <button
            onClick={() => onFiltersChange({ isDecisionMaker: null })}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label="Remover filtro de decisor"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Badge de tem negócios */}
      {filters.hasDeals !== null && (
        <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
          Negócios: {filters.hasDeals ? 'Sim' : 'Não'}
          <button
            onClick={() => onFiltersChange({ hasDeals: null })}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label="Remover filtro de negócios"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Botão limpar todos */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Limpar todos
      </Button>
    </div>
  )
}
