import { Bot, MessageSquare, Wallet, Zap } from 'lucide-react'
import type { AiMetrics } from '@/_data-access/dashboard'
import { formatNumber } from '@/_utils/format-number'
import { formatVariation } from '@/_utils/date-range'
import { KpiCard } from './kpi-card'

interface AiKpiGridProps {
  metrics: AiMetrics
}

export function AiKpiGrid({ metrics }: AiKpiGridProps) {
  const creditsVariation = formatVariation(metrics.creditsUsed, metrics.prevCreditsUsed)
  const messagesVariation = formatVariation(metrics.messagesCount, metrics.prevMessagesCount)

  return (
    <div className="grid h-full w-full grid-cols-2 gap-4">
      <KpiCard
        title="Créditos Consumidos"
        value={`${formatNumber(metrics.creditsUsed)} / ${formatNumber(metrics.monthlyLimit)}`}
        icon={Zap}
        variation={creditsVariation}
      />
      <KpiCard
        title="Mensagens no Período"
        value={formatNumber(metrics.messagesCount)}
        icon={MessageSquare}
        variation={messagesVariation}
      />
      <KpiCard
        title="Saldo Disponível"
        value={formatNumber(metrics.availableBalance)}
        icon={Wallet}
      />
      <KpiCard
        title="Agentes Ativos"
        value={`${metrics.activeAgents} / ${metrics.totalAgents}`}
        icon={Bot}
      />
    </div>
  )
}
