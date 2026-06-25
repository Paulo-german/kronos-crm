'use client'

import { InfoIcon } from 'lucide-react'
import { CustomerStatus, LifecycleStage } from '@prisma/client'
import { Checkbox } from '@/_components/ui/checkbox'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'
import {
  LIFECYCLE_STAGE_CONFIG,
  LIFECYCLE_STAGE_ORDER,
} from '@/_lib/lifecycle/lifecycle-stage-config'
import { CUSTOMER_STATUS_CONFIG } from '@/_lib/lifecycle/customer-status-config'
import type { ContactFilters } from '../_lib/contact-filters'
import { useContactCapabilities } from '../_lib/contact-capabilities-context'

interface ContactFilterControlsProps {
  /** Filtros atuais (controlado) */
  filters: ContactFilters
  /** Chamado a cada alteração com o conjunto completo de filtros */
  onChange: (filters: ContactFilters) => void
  isScoreEnabled: boolean
}

/**
 * Controles de filtro de contatos (lifecycle, status, score, negócios).
 * Componente controlado e sem layout de container — reutilizado tanto pelo
 * Sheet de filtros da listagem de contatos quanto inline no dialog de
 * segmentação, evitando duplicação da lógica de toggle.
 */
export function ContactFilterControls({
  filters,
  onChange,
  isScoreEnabled,
}: ContactFilterControlsProps) {
  const { deals: showDeals } = useContactCapabilities()

  /** Alterna um filtro boolean exclusivo — clica novamente para deselecionar */
  const toggleBooleanFilter = (
    field: 'isDecisionMaker' | 'hasDeals',
    value: boolean,
  ) => {
    const current = filters[field]
    onChange({ ...filters, [field]: current === value ? null : value })
  }

  /** Alterna um lifecycle stage no array multi-select */
  const toggleLifecycleStage = (stage: LifecycleStage) => {
    const arr = filters.lifecycleStages
    onChange({
      ...filters,
      lifecycleStages: arr.includes(stage)
        ? arr.filter((item) => item !== stage)
        : [...arr, stage],
    })
  }

  /** Alterna um customer status no array multi-select */
  const toggleCustomerStatus = (status: CustomerStatus) => {
    const arr = filters.customerStatuses
    onChange({
      ...filters,
      customerStatuses: arr.includes(status)
        ? arr.filter((item) => item !== status)
        : [...arr, status],
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Filtro de Lifecycle Stage */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-semibold">
              Estágio do Ciclo de Vida
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="size-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-56">
                Filtra contatos pela fase atual no seu processo comercial.
                Selecione múltiplos estágios para ver contatos em diferentes
                momentos da jornada.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap gap-2">
            {LIFECYCLE_STAGE_ORDER.map((stage) => {
              const cfg = LIFECYCLE_STAGE_CONFIG[stage]
              const isActive = filters.lifecycleStages.includes(stage)
              return (
                <label
                  key={stage}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    isActive
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border-strong hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={() => toggleLifecycleStage(stage)}
                    className="sr-only"
                  />
                  <cfg.icon
                    className={cn(
                      'size-3.5',
                      isActive ? 'text-primary' : cfg.colorClassName,
                    )}
                  />
                  <span className="text-sm">{cfg.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Filtro de Customer Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-semibold">
              Status do Relacionamento
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="size-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-56">
                Indica o estado atual do relacionamento comercial com o contato
                — ex: ativo, em risco, churned. Selecione múltiplos para
                combinar.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.values(CustomerStatus) as CustomerStatus[]).map(
              (status) => {
                const cfg = CUSTOMER_STATUS_CONFIG[status]
                const isActive = filters.customerStatuses.includes(status)
                return (
                  <label
                    key={status}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                      isActive
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border-strong hover:bg-accent',
                    )}
                  >
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={() => toggleCustomerStatus(status)}
                      className="sr-only"
                    />
                    <span className="text-sm">{cfg.label}</span>
                  </label>
                )
              },
            )}
          </div>
        </div>

        {/* Filtro de Health Score (plan-gated) */}
        {isScoreEnabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-semibold">Health Score</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-3.5 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  Pontuação de 0 a 100 calculada automaticamente com base no
                  engajamento e histórico do contato. 0–40 crítico, 41–70
                  atenção, 71–100 saudável.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="score-min"
                  className="text-xs text-muted-foreground"
                >
                  Mínimo
                </Label>
                <Input
                  id="score-min"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="0"
                  value={filters.healthScoreMin ?? ''}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      healthScoreMin:
                        event.target.value === ''
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="score-max"
                  className="text-xs text-muted-foreground"
                >
                  Máximo
                </Label>
                <Input
                  id="score-max"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="100"
                  value={filters.healthScoreMax ?? ''}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      healthScoreMax:
                        event.target.value === ''
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Filtro de Tem Negócios — só com módulo de deals (CRM) */}
        {showDeals && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-semibold">
                Possui Negócios Vinculados
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-3.5 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  Filtra contatos que já têm ao menos um negócio criado no
                  pipeline, independente do status do negócio.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: true, label: 'Sim' },
                  { value: false, label: 'Não' },
                ] as const
              ).map((option) => (
                <label
                  key={String(option.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    filters.hasDeals === option.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border-strong hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={filters.hasDeals === option.value}
                    onCheckedChange={() =>
                      toggleBooleanFilter('hasDeals', option.value)
                    }
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
