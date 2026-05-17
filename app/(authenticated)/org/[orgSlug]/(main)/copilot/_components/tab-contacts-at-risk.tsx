'use client'

import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Button } from '@/_components/ui/button'
import { SCORE_RED_MAX, SCORE_YELLOW_MAX } from '@/../trigger/lib/health-score-constants'
import type {
  ContactsAtRiskResult,
  ScoreBucketLabel,
} from '@/_data-access/copilot/shared/insights-types'
import type { LifecycleStage } from '@prisma/client'
import { InsightCard } from './insight-card'
import { useContactsAtRiskFilters } from '../_hooks/use-contacts-at-risk-filters'

interface TabContactsAtRiskProps {
  initial: ContactsAtRiskResult
  orgSlug: string
}

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualificado',
  OPPORTUNITY: 'Oportunidade',
  CUSTOMER: 'Cliente',
}

const SORT_LABELS = {
  scoreAsc: 'Pior score',
  ltvDesc: 'Mais LTV',
  recencyAsc: 'Sem interação há mais tempo',
} as const

function deriveScoreLabel(score: number): ScoreBucketLabel {
  if (score <= SCORE_RED_MAX) return 'red'
  if (score <= SCORE_YELLOW_MAX) return 'yellow'
  return 'green'
}

export function TabContactsAtRisk({ initial, orgSlug }: TabContactsAtRiskProps) {
  const { sort, setSort, stage, setStage, page, setPage } = useContactsAtRiskFilters()

  const contacts = initial.data
  const totalPages = initial.totalPages

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
        <p className="text-sm text-muted-foreground">Nenhum contato em risco</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={stage ?? 'all'}
          onValueChange={(value) => setStage(value === 'all' ? null : (value as LifecycleStage))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estágio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estágios</SelectItem>
            <SelectItem value="LEAD">Lead</SelectItem>
            <SelectItem value="QUALIFIED">Qualificado</SelectItem>
            <SelectItem value="OPPORTUNITY">Oportunidade</SelectItem>
            <SelectItem value="CUSTOMER">Cliente</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(value) => setSort(value as keyof typeof SORT_LABELS)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scoreAsc">{SORT_LABELS.scoreAsc}</SelectItem>
            <SelectItem value="ltvDesc">{SORT_LABELS.ltvDesc}</SelectItem>
            <SelectItem value="recencyAsc">{SORT_LABELS.recencyAsc}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact) => {
          const lifecycleLabel = LIFECYCLE_LABELS[contact.lifecycleStage]
          const subtitle = contact.assignedToName
            ? `${lifecycleLabel} · ${contact.assignedToName}`
            : lifecycleLabel

          const meta =
            contact.daysSinceLastInteraction !== null
              ? [{ label: 'Sem interação', value: `${contact.daysSinceLastInteraction}d` }]
              : []

          return (
            <InsightCard
              key={contact.id}
              title={contact.name}
              subtitle={subtitle}
              scoreBadge={{
                value: contact.healthScore,
                label: deriveScoreLabel(contact.healthScore),
              }}
              driver={contact.mainDriver}
              meta={meta}
              primaryAction={{
                label: 'Abrir contato',
                href: `/org/${orgSlug}/contacts/${contact.id}`,
              }}
            />
          )
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
