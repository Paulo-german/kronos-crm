import {
  MessageCircle,
  CheckCircle2,
  Clock,
  Timer,
  Reply,
  AlertTriangle,
  Gauge,
} from 'lucide-react'
import type { MemberRole } from '@prisma/client'
import { getInboxKpiMetrics } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { SLA_FIRST_RESPONSE_MINUTES } from '@/_data-access/dashboard/inbox-dashboard-types'
import { formatVariation, getPreviousPeriod } from '@/_utils/date-range'
import { formatDurationMs } from '@/_utils/format-duration-ms'
import { KpiCard } from './kpi-card'

interface InboxKpiGridProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: InboxDashboardFilters
}

export async function InboxKpiGrid({
  ctx,
  dateRange,
  filters,
}: InboxKpiGridProps) {
  const prevRange = getPreviousPeriod(dateRange)
  const kpi = await getInboxKpiMetrics(ctx, dateRange, prevRange, filters)

  return (
    <div className="grid h-full w-full grid-cols-2 gap-4 md:grid-cols-3">
      {/* KPI 1: Conversas Abertas */}
      <KpiCard
        title="Conversas Abertas"
        value={String(kpi.openConversations)}
        icon={MessageCircle}
        variation={formatVariation(
          kpi.openConversations,
          kpi.prevOpenConversations,
        )}
        iconClassName="text-emerald-500"
        iconBgClassName="bg-emerald-500/10"
        info="Conversas que começaram dentro do período selecionado e ainda não foram marcadas como resolvidas."
      />

      {/* KPI 2: Conversas Resolvidas */}
      <KpiCard
        title="Conversas Resolvidas"
        value={String(kpi.resolvedConversations)}
        icon={CheckCircle2}
        variation={formatVariation(
          kpi.resolvedConversations,
          kpi.prevResolvedConversations,
        )}
        iconClassName="text-primary"
        iconBgClassName="bg-primary/10"
        info="Conversas marcadas como resolvidas dentro do período selecionado (contadas pela data em que foram resolvidas)."
      />

      {/* KPI 3: Tempo 1ª Resposta */}
      <KpiCard
        title="Tempo 1ª Resposta"
        value={
          kpi.avgFirstResponseTimeMs != null
            ? formatDurationMs(kpi.avgFirstResponseTimeMs)
            : '—'
        }
        icon={Clock}
        variation={
          kpi.avgFirstResponseTimeMs != null &&
          kpi.prevAvgFirstResponseTimeMs != null
            ? formatVariation(
                // Inversão: tempo menor é melhor, então invertemos a lógica de isPositive
                kpi.prevAvgFirstResponseTimeMs,
                kpi.avgFirstResponseTimeMs,
              )
            : undefined
        }
        iconClassName="text-amber-500"
        iconBgClassName="bg-amber-500/10"
        info="Tempo médio entre o cliente abrir a conversa e receber a primeira resposta (da IA ou de um atendente). Quanto menor, melhor."
      />

      {/* KPI: Dentro do SLA de 1ª resposta */}
      <KpiCard
        title="Dentro do SLA"
        value={
          kpi.firstResponseSlaRate != null
            ? `${kpi.firstResponseSlaRate}%`
            : '—'
        }
        icon={Gauge}
        variation={
          kpi.firstResponseSlaRate != null &&
          kpi.prevFirstResponseSlaRate != null
            ? formatVariation(
                kpi.firstResponseSlaRate,
                kpi.prevFirstResponseSlaRate,
              )
            : undefined
        }
        iconClassName="text-teal-500"
        iconBgClassName="bg-teal-500/10"
        footnote={`Meta: responder em até ${SLA_FIRST_RESPONSE_MINUTES} min`}
        info={`Percentual de conversas cuja primeira resposta saiu em até ${SLA_FIRST_RESPONSE_MINUTES} minutos. Esse é o alvo de referência do mercado para chat e WhatsApp: quanto mais rápido o primeiro retorno, maior a satisfação e a chance de conversão — depois dos primeiros minutos, a probabilidade de o cliente desistir cresce bastante.`}
      />

      {/* KPI 4: Tempo de Resolução */}
      <KpiCard
        title="Tempo de Resolução"
        value={
          kpi.avgResolutionTimeMs != null
            ? formatDurationMs(kpi.avgResolutionTimeMs)
            : '—'
        }
        icon={Timer}
        iconClassName="text-sky-500"
        iconBgClassName="bg-sky-500/10"
        info="Tempo médio entre a abertura e a resolução da conversa. Mede quanto tempo o cliente espera até o atendimento ser concluído."
      />

      {/* KPI 5: Taxa de Resposta */}
      <KpiCard
        title="Taxa de Resposta"
        value={`${kpi.responseRate.toFixed(1)}%`}
        icon={Reply}
        variation={formatVariation(kpi.responseRate, kpi.prevResponseRate)}
        iconClassName="text-violet-500"
        iconBgClassName="bg-violet-500/10"
        info="Percentual das conversas do período que receberam pelo menos uma resposta. 100% significa que nenhuma ficou sem retorno."
      />

      {/* KPI 6: Não Respondidas (snapshot atual, sem variação) */}
      <KpiCard
        title="Não Respondidas"
        value={String(kpi.unansweredConversations)}
        icon={AlertTriangle}
        iconClassName="text-orange-500"
        iconBgClassName="bg-orange-500/10"
        footnote="Estado atual — não filtra por período"
        info="Conversas abertas em que a última mensagem foi do cliente, ou seja, estão aguardando resposta agora. É uma foto do momento atual e por isso não muda com o filtro de período."
      />
    </div>
  )
}
