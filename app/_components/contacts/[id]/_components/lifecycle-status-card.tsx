'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, Calendar, Star } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Separator } from '@/_components/ui/separator'

import type { ContactDetailDto } from '@/_data-access/contact/get-contact-by-id'
import { changeLifecycleStage } from '@/_actions/contact/change-lifecycle-stage'
import { updateCustomerStatus } from '@/_actions/contact/update-customer-status'
import {
  LIFECYCLE_STAGE_CONFIG,
  LIFECYCLE_STAGE_ORDER,
} from '@/_lib/lifecycle/lifecycle-stage-config'
import { CUSTOMER_STATUS_CONFIG } from '@/_lib/lifecycle/customer-status-config'
import { ScoreBadge } from '@/_components/copilot/_components/score-badge'
import {
  CustomerStatus,
  DealStatus,
  LifecycleStage,
  type MemberRole,
} from '@prisma/client'

const MANUAL_STATUS_OPTIONS = [
  CustomerStatus.ACTIVE,
  CustomerStatus.DORMANT,
  CustomerStatus.CHURNED,
]

interface LifecycleStatusCardProps {
  contact: ContactDetailDto
  userRole: MemberRole
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function LifecycleStatusCard({
  contact,
  userRole,
}: LifecycleStatusCardProps) {
  const statusConfig = CUSTOMER_STATUS_CONFIG[contact.customerStatus]
  const canDowngrade = userRole === 'ADMIN' || userRole === 'OWNER'

  const hasDeals = contact.deals.length > 0
  const hasWonDeals = contact.deals.some(
    (deal) => deal.status === DealStatus.WON,
  )

  const { execute, isPending } = useAction(changeLifecycleStage, {
    onSuccess: ({ data }) => {
      if (data?.applied) {
        toast.success('Estágio atualizado com sucesso.', {
          position: 'bottom-right',
        })
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar estágio.', {
        position: 'bottom-right',
      })
    },
  })

  const { execute: executeStatusUpdate, isPending: isStatusPending } =
    useAction(updateCustomerStatus, {
      onSuccess: ({ data }) => {
        if (data?.applied) {
          toast.success('Status do cliente atualizado.', {
            position: 'bottom-right',
          })
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar status.', {
          position: 'bottom-right',
        })
      },
    })

  const handleStageChange = (value: string) => {
    execute({
      contactId: contact.id,
      toStage: value as typeof contact.lifecycleStage,
    })
  }

  const handleStatusChange = (value: string) => {
    executeStatusUpdate({
      contactId: contact.id,
      status: value as 'ACTIVE' | 'DORMANT' | 'CHURNED',
    })
  }

  const isCustomer = contact.lifecycleStage === LifecycleStage.CUSTOMER

  const dates = [
    { label: 'Criado em', value: formatDate(contact.createdAt) },
    { label: 'Qualificado em', value: formatDate(contact.qualifiedAt) },
    {
      label: 'Oportunidade desde',
      value: formatDate(contact.becameOpportunityAt),
    },
    { label: 'Cliente desde', value: formatDate(contact.becameCustomerAt) },
    { label: 'Última interação', value: formatDate(contact.lastInteractionAt) },
  ]

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-4 w-4" />
          Ciclo & Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Estágio:</span>
            <Select
              value={contact.lifecycleStage}
              onValueChange={handleStageChange}
              disabled={isPending}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 border-border/50 bg-background text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STAGE_ORDER.map((stage) => {
                  const cfg = LIFECYCLE_STAGE_CONFIG[stage]
                  const currentIndex = LIFECYCLE_STAGE_ORDER.indexOf(
                    contact.lifecycleStage,
                  )
                  const stageIndex = LIFECYCLE_STAGE_ORDER.indexOf(stage)
                  const isDowngrade = stageIndex < currentIndex
                  const isAdvance = stageIndex > currentIndex

                  const needsDealHint =
                    isAdvance &&
                    (stage === LifecycleStage.OPPORTUNITY ||
                      stage === LifecycleStage.CUSTOMER) &&
                    !hasDeals
                  const needsWonDealHint =
                    isAdvance &&
                    stage === LifecycleStage.CUSTOMER &&
                    hasDeals &&
                    !hasWonDeals

                  const disabled =
                    (isDowngrade && !canDowngrade) ||
                    needsDealHint ||
                    needsWonDealHint

                  const hint =
                    isDowngrade && !canDowngrade
                      ? '(admin)'
                      : needsDealHint
                        ? '(sem negócio)'
                        : needsWonDealHint
                          ? '(sem negócio ganho)'
                          : null

                  return (
                    <SelectItem key={stage} value={stage} disabled={disabled}>
                      <span className="flex items-center gap-2">
                        <cfg.icon
                          className={`h-3.5 w-3.5 ${cfg.colorClassName}`}
                        />
                        {cfg.label}
                        {hint && (
                          <span className="text-xs text-muted-foreground">
                            {hint}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select
              value={contact.customerStatus}
              onValueChange={handleStatusChange}
              disabled={!isCustomer || isStatusPending || isPending}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 border-border/50 bg-background text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isCustomer ? (
                  MANUAL_STATUS_OPTIONS.map((statusOption) => {
                    const cfg = CUSTOMER_STATUS_CONFIG[statusOption]
                    return (
                      <SelectItem key={statusOption} value={statusOption}>
                        <span
                          className={`flex items-center gap-1.5 ${cfg.colorClassName}`}
                        >
                          {cfg.label}
                        </span>
                      </SelectItem>
                    )
                  })
                ) : (
                  <SelectItem value={contact.customerStatus} disabled>
                    <span className="text-muted-foreground">
                      {statusConfig.label}
                      <span className="ml-1.5 text-xs">
                        (apenas para clientes)
                      </span>
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {contact.healthScore !== null && (
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Score:</span>
              <ScoreBadge score={Math.round(contact.healthScore)} />
            </div>
          )}
        </div>

        <Separator className="bg-border/50" />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {dates.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {label}
              </span>
              <span className="text-sm font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
