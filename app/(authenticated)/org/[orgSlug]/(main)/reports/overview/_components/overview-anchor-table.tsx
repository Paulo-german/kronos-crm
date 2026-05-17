'use client'

import { formatVariation } from '@/_utils/date-range'
import { formatCurrency } from '@/_utils/format-currency'
import { cn } from '@/_lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ChannelAttributionDto } from '@/_data-access/reports/overview/get-channel-attribution'

interface OverviewAnchorTableProps {
  data: ChannelAttributionDto
  onDrillChannel: (channel: string) => void
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  EMAIL: 'E-mail',
  WEBCHAT: 'Webchat',
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const variation = formatVariation(current, previous)
  return (
    <span
      className={cn(
        'ml-1 inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[10px] font-medium tabular-nums',
        variation.isPositive
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
      )}
    >
      {variation.isPositive ? (
        <TrendingUp className="size-2.5" />
      ) : (
        <TrendingDown className="size-2.5" />
      )}
      {variation.value}
    </span>
  )
}

export function OverviewAnchorTable({ data, onDrillChannel }: OverviewAnchorTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left">
            <th className="pb-2 pr-4 font-medium text-muted-foreground">Canal</th>
            <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Leads</th>
            <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Clientes</th>
            <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">Conversão</th>
            <th className="pb-2 text-right font-medium text-muted-foreground">Receita</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr
              key={row.channel}
              role="button"
              tabIndex={0}
              className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              onClick={() => onDrillChannel(row.channel)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onDrillChannel(row.channel)
                }
              }}
            >
              <td className="py-2.5 pr-4 font-medium">
                {CHANNEL_LABELS[row.channel] ?? row.channel}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {row.leadsCount}
                <DeltaBadge current={row.leadsCount} previous={row.prevLeadsCount} />
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {row.customersCount}
                <DeltaBadge current={row.customersCount} previous={row.prevCustomersCount} />
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {row.conversionRate.toFixed(1)}%
                <DeltaBadge current={row.conversionRate} previous={row.prevConversionRate} />
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {formatCurrency(row.revenue)}
                <DeltaBadge current={row.revenue} previous={row.prevRevenue} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/30">
            <td className="py-2.5 pr-4 font-semibold">Total</td>
            <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
              {data.totalLeads}
            </td>
            <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
              {data.totalCustomers}
            </td>
            <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
              {data.totalLeads > 0
                ? ((data.totalCustomers / data.totalLeads) * 100).toFixed(1)
                : '0.0'}%
            </td>
            <td className="py-2.5 text-right font-semibold tabular-nums">
              {formatCurrency(data.totalRevenue)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
