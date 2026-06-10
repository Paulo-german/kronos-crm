'use client'

import { X } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { CUSTOMER_STATUS_CONFIG } from '@/_lib/lifecycle/customer-status-config'
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

  const scoreLabel = (() => {
    const { healthScoreMin: min, healthScoreMax: max } = filters
    if (min !== null && max !== null) return `Score: ${min}-${max}`
    if (min !== null) return `Score: ≥${min}`
    if (max !== null) return `Score: ≤${max}`
    return null
  })()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Chips de lifecycle stage — 1 por stage */}
      {filters.lifecycleStages.map((stage) => {
        const cfg = LIFECYCLE_STAGE_CONFIG[stage]
        return (
          <Badge
            key={stage}
            variant="secondary"
            className="gap-1 pr-1 text-xs font-normal"
          >
            <cfg.icon className="size-3" />
            {cfg.label}
            <button
              onClick={() =>
                onFiltersChange({
                  lifecycleStages: filters.lifecycleStages.filter(
                    (item) => item !== stage,
                  ),
                })
              }
              className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              aria-label={`Remover filtro ${cfg.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}

      {/* Chips de customer status — 1 por status */}
      {filters.customerStatuses.map((status) => {
        const cfg = CUSTOMER_STATUS_CONFIG[status]
        return (
          <Badge
            key={status}
            variant="secondary"
            className="gap-1 pr-1 text-xs font-normal"
          >
            {cfg.label}
            <button
              onClick={() =>
                onFiltersChange({
                  customerStatuses: filters.customerStatuses.filter(
                    (item) => item !== status,
                  ),
                })
              }
              className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              aria-label={`Remover filtro ${cfg.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}

      {/* Chip de health score range — único combinado */}
      {scoreLabel && (
        <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
          {scoreLabel}
          <button
            onClick={() =>
              onFiltersChange({ healthScoreMin: null, healthScoreMax: null })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label="Remover filtro de health score"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

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
