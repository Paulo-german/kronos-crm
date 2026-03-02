import { Bot, MessageSquare, Wallet, Zap } from 'lucide-react'
import type { AiMetrics } from '@/_data-access/dashboard'
import { formatNumber } from '@/_utils/format-number'
import { KpiCard } from './kpi-card'

interface AiKpiGridProps {
  metrics: AiMetrics
}

export function AiKpiGrid({ metrics }: AiKpiGridProps) {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-4">
      <KpiCard
        title="Créditos Consumidos"
        value={`${formatNumber(metrics.creditsUsed)} / ${formatNumber(metrics.monthlyLimit)}`}
        icon={Zap}
      />
      <KpiCard
        title="Mensagens no Mês"
        value={formatNumber(metrics.messagesCount)}
        icon={MessageSquare}
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
