import {
  Building2,
  CalendarRange,
  Gauge,
  Handshake,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { CUSTOMER_STATUS_CONFIG } from '@/_lib/lifecycle/customer-status-config'
import type { ContactFilters } from '@/_components/contacts/_lib/contact-filters'

export interface FilterChip {
  key: string
  label: string
  icon?: LucideIcon
  /** Classe de badge colorida do estágio/status; ausente para filtros neutros */
  className?: string
}

/**
 * Traduz os filtros de um segmento em chips legíveis (somente leitura).
 * Espelha a ordem visual de `ContactFilterBadges`, mas sem botões de remover —
 * usado nos cards da listagem e no preview do dialog de criação/edição.
 */
export function describeContactFilters(filters: ContactFilters): FilterChip[] {
  const chips: FilterChip[] = []

  for (const stage of filters.lifecycleStages) {
    const cfg = LIFECYCLE_STAGE_CONFIG[stage]
    chips.push({
      key: `stage-${stage}`,
      label: cfg.label,
      icon: cfg.icon,
      className: cfg.badgeClassName,
    })
  }

  for (const status of filters.customerStatuses) {
    const cfg = CUSTOMER_STATUS_CONFIG[status]
    chips.push({
      key: `status-${status}`,
      label: cfg.label,
      className: cfg.badgeClassName,
    })
  }

  const { healthScoreMin: min, healthScoreMax: max } = filters
  if (min !== null && max !== null) {
    chips.push({ key: 'score', label: `Score ${min}–${max}`, icon: Gauge })
  } else if (min !== null) {
    chips.push({ key: 'score', label: `Score ≥ ${min}`, icon: Gauge })
  } else if (max !== null) {
    chips.push({ key: 'score', label: `Score ≤ ${max}`, icon: Gauge })
  }

  if (filters.companyId) {
    chips.push({
      key: 'company',
      label: 'Empresa específica',
      icon: Building2,
    })
  }

  if (filters.isDecisionMaker !== null) {
    chips.push({
      key: 'decision',
      label: filters.isDecisionMaker ? 'Decisor' : 'Não decisor',
      icon: UserCheck,
    })
  }

  if (filters.hasDeals !== null) {
    chips.push({
      key: 'deals',
      label: filters.hasDeals ? 'Com negócios' : 'Sem negócios',
      icon: Handshake,
    })
  }

  const { createdAtFrom, createdAtTo } = filters
  if (createdAtFrom && createdAtTo) {
    chips.push({
      key: 'created',
      label: `Criado ${format(new Date(createdAtFrom), 'dd/MM/yy')} – ${format(new Date(createdAtTo), 'dd/MM/yy')}`,
      icon: CalendarRange,
    })
  } else if (createdAtFrom) {
    chips.push({
      key: 'created',
      label: `Criado a partir de ${format(new Date(createdAtFrom), 'dd/MM/yy')}`,
      icon: CalendarRange,
    })
  } else if (createdAtTo) {
    chips.push({
      key: 'created',
      label: `Criado até ${format(new Date(createdAtTo), 'dd/MM/yy')}`,
      icon: CalendarRange,
    })
  }

  return chips
}
