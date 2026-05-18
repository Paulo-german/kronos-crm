'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, Calendar, Star } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
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
import {
  LIFECYCLE_STAGE_CONFIG,
  LIFECYCLE_STAGE_ORDER,
} from '@/_lib/lifecycle/lifecycle-stage-config'
import { CUSTOMER_STATUS_CONFIG } from '@/_lib/lifecycle/customer-status-config'
import { ScoreBadge } from '@/(authenticated)/org/[orgSlug]/(main)/copilot/_components/score-badge'
import type { MemberRole } from '@prisma/client'

interface LifecycleStatusCardProps {
  contact: ContactDetailDto
  userRole: MemberRole
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return format(date, "dd/MM/yyyy", { locale: ptBR })
}

export function LifecycleStatusCard({ contact, userRole }: LifecycleStatusCardProps) {
  const stageConfig = LIFECYCLE_STAGE_CONFIG[contact.lifecycleStage]
  const statusConfig = CUSTOMER_STATUS_CONFIG[contact.customerStatus]
  const canDowngrade = userRole === 'ADMIN' || userRole === 'OWNER'

  const { execute, isPending } = useAction(changeLifecycleStage, {
    onSuccess: ({ data }) => {
      if (data?.applied) {
        toast.success('Estágio atualizado com sucesso.', { position: 'bottom-right' })
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar estágio.', { position: 'bottom-right' })
    },
  })

  const handleStageChange = (value: string) => {
    execute({ contactId: contact.id, toStage: value as typeof contact.lifecycleStage })
  }

  const dates = [
    { label: 'Criado em', value: formatDate(contact.createdAt) },
    { label: 'Qualificado em', value: formatDate(contact.qualifiedAt) },
    { label: 'Oportunidade desde', value: formatDate(contact.becameOpportunityAt) },
    { label: 'Cliente desde', value: formatDate(contact.becameCustomerAt) },
    { label: 'Última interação', value: formatDate(contact.lastInteractionAt) },
  ]

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-4 w-4" />
          Lifecycle & Status
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
                <stageConfig.icon className={`h-3.5 w-3.5 ${stageConfig.colorClassName}`} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STAGE_ORDER.map((stage) => {
                  const cfg = LIFECYCLE_STAGE_CONFIG[stage]
                  const currentIndex = LIFECYCLE_STAGE_ORDER.indexOf(contact.lifecycleStage)
                  const stageIndex = LIFECYCLE_STAGE_ORDER.indexOf(stage)
                  const isDowngrade = stageIndex < currentIndex
                  const disabled = isDowngrade && !canDowngrade

                  return (
                    <SelectItem key={stage} value={stage} disabled={disabled}>
                      <span className="flex items-center gap-2">
                        <cfg.icon className={`h-3.5 w-3.5 ${cfg.colorClassName}`} />
                        {cfg.label}
                        {isDowngrade && !canDowngrade && (
                          <span className="text-xs text-muted-foreground">(admin)</span>
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
            <Badge variant="outline" className={`text-xs font-medium ${statusConfig.badgeClassName}`}>
              {statusConfig.label}
            </Badge>
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
